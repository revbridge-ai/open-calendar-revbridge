import {
  addMinutes,
  parse,
  format,
  isBefore,
  areIntervalsOverlapping,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { listEvents } from './google/calendar';
import {
  getUserSettings,
  getMeetingTypeBySlug,
  getMeetingType,
  getBookingsForDate,
  getBookingsInRange,
} from './firebase/collections';
import { AvailableSlot, TimeSlot, GoogleCalendarEvent, Booking, MeetingType, UserSettings, WeeklyAvailability } from '@/types';

interface Interval {
  start: Date;
  end: Date;
}

interface GetSlotsParams {
  userId: string;
  meetingTypeSlug: string;
  date: string; // YYYY-MM-DD
  guestTimezone: string;
}

/**
 * Resolve qual disponibilidade usar:
 * - Se meeting type tem custom availability, usa ela
 * - Senao, usa a disponibilidade global do usuario
 */
function getEffectiveAvailability(
  meetingType: MeetingType,
  settings: UserSettings
): WeeklyAvailability {
  if (meetingType.useCustomAvailability && meetingType.availability) {
    return meetingType.availability;
  }
  return settings.availability;
}

export async function getAvailableSlots(
  params: GetSlotsParams
): Promise<AvailableSlot[]> {
  const { userId, meetingTypeSlug, date, guestTimezone } = params;

  // 1. Buscar configurações e tipo de reunião do usuário
  const settings = await getUserSettings(userId);
  const meetingType = await getMeetingTypeBySlug(userId, meetingTypeSlug);

  if (!meetingType || !meetingType.isActive) {
    return [];
  }

  // 2. Verificar dia da semana
  const targetDate = new Date(date + 'T12:00:00'); // Meio-dia para evitar problemas de timezone
  const dayOfWeek = targetDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // Usar disponibilidade do meeting type se definida, senao usar global
  const effectiveAvailability = getEffectiveAvailability(meetingType, settings);
  const dayConfig = effectiveAvailability[dayOfWeek];

  if (!dayConfig.enabled || dayConfig.slots.length === 0) {
    return [];
  }

  // 3. Gerar todos os slots possíveis
  const possibleSlots = generateSlotsForDay(
    date,
    dayConfig.slots,
    meetingType.duration,
    settings.timezone
  );

  // 4. Buscar eventos existentes do Google Calendar
  // Parse the date correctly in the owner's timezone
  const startOfDayLocal = parse(`${date} 00:00`, 'yyyy-MM-dd HH:mm', new Date());
  const endOfDayLocal = parse(`${date} 23:59`, 'yyyy-MM-dd HH:mm', new Date());
  const dayStart = fromZonedTime(startOfDayLocal, settings.timezone);
  const dayEnd = fromZonedTime(endOfDayLocal, settings.timezone);

  let googleEvents: GoogleCalendarEvent[] = [];
  try {
    googleEvents = await listEvents(userId, settings.googleCalendarId, dayStart, dayEnd);
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    // Continuar sem eventos do Google se houver erro
  }

  // 5. Buscar bookings existentes
  const existingBookings = await getBookingsForDate(userId, date);

  // 6. Criar intervalos bloqueados
  const blockedIntervals = createBlockedIntervals(
    googleEvents,
    existingBookings,
    meetingType.bufferBefore,
    meetingType.bufferAfter
  );

  // 7. Filtrar slots disponíveis
  const now = new Date();
  const minNoticeTime = addMinutes(now, settings.minimumNotice * 60);

  const availableSlots = possibleSlots.filter((slot) => {
    // Verificar antecedência mínima
    if (isBefore(slot.start, minNoticeTime)) {
      return false;
    }

    // Verificar conflitos
    const hasConflict = blockedIntervals.some((blocked) =>
      areIntervalsOverlapping({ start: slot.start, end: slot.end }, blocked)
    );

    return !hasConflict;
  });

  // 8. Converter para timezone do visitante
  return availableSlots.map((slot) => ({
    time: format(toZonedTime(slot.start, guestTimezone), 'h:mm a'),
    datetime: slot.start.toISOString(),
  }));
}

function generateSlotsForDay(
  date: string,
  timeSlots: TimeSlot[],
  duration: number,
  ownerTimezone: string
): Interval[] {
  const slots: Interval[] = [];

  for (const timeSlot of timeSlots) {
    const startTime = parse(
      `${date} ${timeSlot.start}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    const endTime = parse(
      `${date} ${timeSlot.end}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );

    let current = fromZonedTime(startTime, ownerTimezone);
    const end = fromZonedTime(endTime, ownerTimezone);

    while (addMinutes(current, duration) <= end) {
      slots.push({
        start: current,
        end: addMinutes(current, duration),
      });
      current = addMinutes(current, duration);
    }
  }

  return slots;
}

function createBlockedIntervals(
  googleEvents: GoogleCalendarEvent[],
  bookings: Booking[],
  bufferBefore: number,
  bufferAfter: number
): Interval[] {
  const intervals: Interval[] = [];

  // Eventos do Google Calendar
  // bufferAfter = tempo necessário APÓS a reunião terminar (antes do próximo evento começar)
  // bufferBefore = tempo necessário ANTES da reunião começar (depois do evento anterior terminar)
  for (const event of googleEvents) {
    if (!event.start.dateTime || !event.end.dateTime) continue;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    intervals.push({
      start: addMinutes(start, -bufferAfter),  // Não pode terminar reunião muito perto do início do evento
      end: addMinutes(end, bufferBefore),       // Não pode começar reunião muito perto do fim do evento
    });
  }

  // Bookings existentes
  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;

    intervals.push({
      start: addMinutes(booking.startTime, -bufferAfter),
      end: addMinutes(booking.endTime, bufferBefore),
    });
  }

  return intervals;
}

// Verificar se slot específico está disponível (double-check)
export async function isSlotAvailable(
  userId: string,
  meetingTypeId: string,
  startTime: Date
): Promise<boolean> {
  const settings = await getUserSettings(userId);
  const meetingType = await getMeetingType(userId, meetingTypeId);

  if (!meetingType) {
    return false;
  }

  const endTime = addMinutes(startTime, meetingType.duration);
  const bufferedStart = addMinutes(startTime, -meetingType.bufferBefore);
  const bufferedEnd = addMinutes(endTime, meetingType.bufferAfter);

  // Verificar Google Calendar
  let googleEvents: GoogleCalendarEvent[] = [];
  try {
    googleEvents = await listEvents(
      userId,
      settings.googleCalendarId,
      bufferedStart,
      bufferedEnd
    );
  } catch (error) {
    console.error('Error checking Google Calendar:', error);
  }

  if (googleEvents.length > 0) {
    return false;
  }

  // Verificar bookings existentes
  const existingBookings = await getBookingsInRange(userId, bufferedStart, bufferedEnd);

  if (existingBookings.length > 0) {
    return false;
  }

  return true;
}
