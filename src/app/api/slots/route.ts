import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/availability';
import { getUserIdByUsername } from '@/lib/firebase/collections';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const username = searchParams.get('username');
  const type = searchParams.get('type');
  const date = searchParams.get('date');
  const tz = searchParams.get('tz');

  if (!username || !type || !date || !tz) {
    return NextResponse.json(
      { error: 'Missing required parameters: username, type, date, tz' },
      { status: 400 }
    );
  }

  // Validar formato da data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    // Buscar userId pelo username
    const userId = await getUserIdByUsername(username);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const slots = await getAvailableSlots({
      userId,
      meetingTypeSlug: type,
      date,
      guestTimezone: tz,
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}
