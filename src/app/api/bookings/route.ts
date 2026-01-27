import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createBooking,
  getBookings,
  getUpcomingBookings,
  getMeetingType,
  getUserSettings,
  getUserIdByUsername,
  getUserProfile,
} from '@/lib/firebase/collections';
import { createEvent } from '@/lib/google/calendar';
import { isSlotAvailable } from '@/lib/availability';
import { addMinutes } from 'date-fns';
import { requireAuthWithUserId } from '@/lib/auth';
import { dispatchIntegrationEvent } from '@/lib/integrations';

const bookingSchema = z.object({
  ownerUsername: z.string().min(1),
  meetingTypeId: z.string(),
  startTime: z.string().datetime(),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestCompany: z.string().min(1),
  guestNotes: z.string().optional(),
  additionalGuests: z.array(
    z.object({
      name: z.string().min(1, 'Nome é obrigatório').max(100),
      email: z.string().email('Email inválido').max(100),
    })
  )
    .max(10, 'Máximo de 10 convidados adicionais')
    .optional()
    .refine(
      (guests) => {
        if (!guests || guests.length === 0) return true;
        const emails = guests.map(g => g.email.toLowerCase());
        return emails.length === new Set(emails).size;
      },
      { message: 'Emails duplicados não são permitidos' }
    ),
  guestTimezone: z.string(),
});

// GET - Protegido (lista bookings do usuário logado)
export async function GET(request: NextRequest) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upcoming = request.nextUrl.searchParams.get('upcoming') === 'true';

  try {
    const bookings = upcoming
      ? await getUpcomingBookings(userId)
      : await getBookings(userId);
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST - Público (criar booking para um usuário específico)
export async function POST(request: NextRequest) {
  let data;

  try {
    const body = await request.json();
    data = bookingSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    // Buscar userId pelo username
    const ownerId = await getUserIdByUsername(data.ownerUsername);
    if (!ownerId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Buscar tipo de reunião do usuário
    const meetingType = await getMeetingType(ownerId, data.meetingTypeId);
    if (!meetingType || !meetingType.isActive) {
      return NextResponse.json(
        { error: 'Meeting type not found or inactive' },
        { status: 404 }
      );
    }

    const startTime = new Date(data.startTime);
    const endTime = addMinutes(startTime, meetingType.duration);

    // Double-check disponibilidade
    const available = await isSlotAvailable(ownerId, data.meetingTypeId, startTime);
    if (!available) {
      return NextResponse.json(
        { error: 'Slot is no longer available' },
        { status: 409 }
      );
    }

    // Buscar configurações do dono
    const settings = await getUserSettings(ownerId);

    // Criar evento no Google Calendar do dono
    const googleEventId = await createEvent(ownerId, settings.googleCalendarId, {
      summary: `${meetingType.name} - ${data.guestName}`,
      description: data.guestNotes || `Booking via RevBridge Calendar\nEmail: ${data.guestEmail}`,
      startTime,
      endTime,
      attendeeEmail: data.guestEmail,
      additionalGuests: data.additionalGuests,
      color: meetingType.color,
    });

    // Salvar booking no Firestore do dono
    const booking = await createBooking(ownerId, {
      meetingTypeId: data.meetingTypeId,
      meetingTypeName: meetingType.name,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestCompany: data.guestCompany,
      guestNotes: data.guestNotes || null,
      additionalGuests: data.additionalGuests || [],
      guestTimezone: data.guestTimezone,
      startTime,
      endTime,
      googleEventId,
      status: 'confirmed',
    });

    // Disparar notificacoes de integracao (assincrono, nao bloqueia)
    const ownerProfile = await getUserProfile(ownerId);
    dispatchIntegrationEvent(ownerId, {
      type: 'booking.created',
      booking: {
        id: booking.id,
        meetingTypeId: data.meetingTypeId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestCompany: data.guestCompany,
        meetingTypeName: meetingType.name,
        startTime,
        endTime,
        guestTimezone: data.guestTimezone,
        guestNotes: data.guestNotes || null,
        additionalGuests: data.additionalGuests,
      },
      owner: {
        displayName: ownerProfile?.displayName || 'User',
        username: ownerProfile?.username || data.ownerUsername,
        timezone: settings.timezone,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
