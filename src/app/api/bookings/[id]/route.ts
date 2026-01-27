import { NextRequest, NextResponse } from 'next/server';
import {
  getBooking,
  updateBookingStatus,
  getUserSettings,
  getUserProfile,
} from '@/lib/firebase/collections';
import { deleteEvent } from '@/lib/google/calendar';
import { sendCancellationEmail } from '@/lib/google/gmail';
import { requireAuthWithUserId, getCurrentUserId } from '@/lib/auth';
import { dispatchIntegrationEvent } from '@/lib/integrations';

type RouteParams = { params: Promise<{ id: string }> };

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return request.nextUrl.origin;
}

// GET - Protegido (ver detalhes do booking do admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const booking = await getBooking(userId, id);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT - Cancelar booking (pode ser público com token ou protegido)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only cancellation is allowed' },
        { status: 400 }
      );
    }

    const booking = await getBooking(userId, id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking already cancelled' },
        { status: 400 }
      );
    }

    // Deletar evento do Google Calendar
    const settings = await getUserSettings(userId);
    try {
      await deleteEvent(userId, settings.googleCalendarId, booking.googleEventId);
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      // Continuar mesmo se falhar a deleção do evento
    }

    // Atualizar status no Firestore
    await updateBookingStatus(userId, id, 'cancelled');

    // Disparar notificacao de cancelamento (assincrono)
    const userProfile = await getUserProfile(userId);
    dispatchIntegrationEvent(userId, {
      type: 'booking.cancelled',
      booking: {
        id: booking.id,
        meetingTypeId: booking.meetingTypeId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestCompany: booking.guestCompany || '',
        meetingTypeName: booking.meetingTypeName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestTimezone: booking.guestTimezone,
        guestNotes: booking.guestNotes,
      },
      owner: {
        displayName: userProfile?.displayName || 'User',
        username: userProfile?.username || 'user',
        timezone: settings.timezone,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}

// DELETE - Protegido (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const booking = await getBooking(userId, id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const settings = await getUserSettings(userId);

    // Deletar evento do Google Calendar se ainda não cancelado
    if (booking.status !== 'cancelled') {
      try {
        await deleteEvent(userId, settings.googleCalendarId, booking.googleEventId);
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
      }
    }

    // Marcar como cancelado (soft delete)
    await updateBookingStatus(userId, id, 'cancelled');

    // Enviar email de cancelamento para o guest
    const baseUrl = getBaseUrl(request);
    const userProfile = await getUserProfile(userId);
    const username = userProfile?.username || 'user';

    console.log('[DELETE /api/bookings] Sending cancellation email to:', booking.guestEmail);
    try {
      await sendCancellationEmail(userId, {
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        meetingTypeName: booking.meetingTypeName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestTimezone: booking.guestTimezone,
        bookingLink: `${baseUrl}/book/${username}`,
        customMessage: userProfile?.cancellationMessage,
      });
      console.log('[DELETE /api/bookings] Cancellation email sent successfully');
    } catch (error) {
      console.error('[DELETE /api/bookings] Error sending cancellation email:', error);
      // Não falhar se o email não for enviado
    }

    // Disparar notificacao de cancelamento (assincrono)
    dispatchIntegrationEvent(userId, {
      type: 'booking.cancelled',
      booking: {
        id: booking.id,
        meetingTypeId: booking.meetingTypeId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestCompany: booking.guestCompany || '',
        meetingTypeName: booking.meetingTypeName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestTimezone: booking.guestTimezone,
        guestNotes: booking.guestNotes,
      },
      owner: {
        displayName: userProfile?.displayName || 'User',
        username: username,
        timezone: settings.timezone,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}
