import { google, calendar_v3 } from 'googleapis';
import { createOAuth2Client } from './auth';
import { getValidAccessToken } from './tokens';
import { GoogleCalendarEvent } from '@/types';

// Google Calendar color IDs mapping
// https://developers.google.com/calendar/api/v3/reference/colors
const GOOGLE_CALENDAR_COLORS: Record<string, string> = {
  '#3B82F6': '9',   // Blue -> Blueberry
  '#10B981': '10',  // Green -> Basil
  '#F59E0B': '5',   // Amber -> Banana
  '#EF4444': '11',  // Red -> Tomato
  '#8B5CF6': '3',   // Purple -> Grape
  '#EC4899': '4',   // Pink -> Flamingo
  '#06B6D4': '7',   // Cyan -> Peacock
  '#F97316': '6',   // Orange -> Tangerine
};

function getGoogleCalendarColorId(hexColor: string): string | undefined {
  // Normalize hex color to uppercase
  const normalized = hexColor.toUpperCase();
  return GOOGLE_CALENDAR_COLORS[normalized] || GOOGLE_CALENDAR_COLORS[hexColor];
}

async function getCalendarClient(userId?: string): Promise<calendar_v3.Calendar> {
  const accessToken = await getValidAccessToken(userId);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Listar eventos em um intervalo de datas
export async function listEvents(
  userId: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || [])
    .filter((event) => event.start?.dateTime) // Ignorar eventos de dia inteiro
    .map((event) => ({
      id: event.id!,
      summary: event.summary || 'Sem título',
      start: {
        dateTime: event.start?.dateTime || event.start?.date || '',
        timeZone: event.start?.timeZone ?? undefined,
      },
      end: {
        dateTime: event.end?.dateTime || event.end?.date || '',
        timeZone: event.end?.timeZone ?? undefined,
      },
    }));
}

// Criar novo evento
export async function createEvent(
  userId: string,
  calendarId: string,
  params: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
    additionalGuests?: Array<{ name: string; email: string }>; // Convidados adicionais
    color?: string; // Hex color from meeting type
  }
): Promise<string> {
  const calendar = await getCalendarClient(userId);

  const colorId = params.color ? getGoogleCalendarColorId(params.color) : undefined;

  // Construir lista de attendees (principal + adicionais)
  const attendees = [{ email: params.attendeeEmail }];
  if (params.additionalGuests && params.additionalGuests.length > 0) {
    attendees.push(...params.additionalGuests.map(guest => ({
      email: guest.email,
      displayName: guest.name,
    })));
  }

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1, // Habilita criação automática do Google Meet
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees,
      colorId, // Cor do evento no Google Calendar
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 dia antes
          { method: 'popup', minutes: 30 }, // 30 min antes
        ],
      },
    },
    sendUpdates: 'all', // Envia convite para attendees
  });

  return response.data.id!;
}

// Deletar evento
export async function deleteEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = await getCalendarClient(userId);

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: 'all',
  });
}

// Obter evento específico
export async function getEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<GoogleCalendarEvent | null> {
  const calendar = await getCalendarClient(userId);

  try {
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    const event = response.data;
    return {
      id: event.id!,
      summary: event.summary || 'Sem título',
      start: {
        dateTime: event.start?.dateTime || event.start?.date || '',
        timeZone: event.start?.timeZone ?? undefined,
      },
      end: {
        dateTime: event.end?.dateTime || event.end?.date || '',
        timeZone: event.end?.timeZone ?? undefined,
      },
    };
  } catch {
    return null;
  }
}

// Listar calendários do usuário
export async function listCalendars(userId?: string): Promise<
  { id: string; summary: string; primary: boolean }[]
> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.calendarList.list();

  return (response.data.items || []).map((cal) => ({
    id: cal.id!,
    summary: cal.summary || cal.id!,
    primary: cal.primary || false,
  }));
}
