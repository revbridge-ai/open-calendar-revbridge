import { NextRequest, NextResponse } from 'next/server';
import {
  getUserIdByUsername,
  getActiveMeetingTypes,
  getUserSettings,
} from '@/lib/firebase/collections';
import { WeeklyAvailability } from '@/types';

type RouteParams = { params: Promise<{ username: string }> };

// Helper para extrair dias habilitados da disponibilidade
function getEnabledDays(availability: WeeklyAvailability): number[] {
  const enabledDays: number[] = [];
  for (let day = 0; day <= 6; day++) {
    const dayConfig = availability[day as keyof WeeklyAvailability];
    if (dayConfig.enabled && dayConfig.slots.length > 0) {
      enabledDays.push(day);
    }
  }
  return enabledDays;
}

// GET - Público (lista meeting types ativos do usuário)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { username } = await params;

  try {
    const userId = await getUserIdByUsername(username);

    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const [meetingTypes, settings] = await Promise.all([
      getActiveMeetingTypes(userId),
      getUserSettings(userId),
    ]);

    // Retornar dados públicos dos meeting types com dias habilitados
    return NextResponse.json(
      meetingTypes.map((mt) => {
        // Usar disponibilidade do meeting type se definida, senão usar global
        const availability = mt.useCustomAvailability && mt.availability
          ? mt.availability
          : settings.availability;

        return {
          id: mt.id,
          slug: mt.slug,
          name: mt.name,
          description: mt.description,
          duration: mt.duration,
          color: mt.color,
          enabledDays: getEnabledDays(availability),
        };
      })
    );
  } catch (error) {
    console.error('Error fetching meeting types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting types' },
      { status: 500 }
    );
  }
}
