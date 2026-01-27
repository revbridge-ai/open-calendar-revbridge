import { format } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Converter horário local para UTC
export function localToUTC(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

// Converter UTC para horário local
export function utcToLocal(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

// Formatar data no timezone específico
export function formatInTz(
  date: Date,
  timezone: string,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  return formatInTimeZone(date, timezone, formatStr, { locale: ptBR });
}

// Detectar timezone do navegador (client-side)
export function detectTimezone(): string {
  if (typeof window !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'America/Sao_Paulo';
}

// Lista de timezones brasileiros
export const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
];

// Lista completa de timezones (para visitantes internacionais)
export function getAllTimezones(): { value: string; label: string }[] {
  const timezones = Intl.supportedValuesOf('timeZone');
  return timezones.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));
}

// Formatar hora para exibição
export function formatTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'HH:mm');
}

// Formatar data completa para exibição
export function formatDateTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "dd 'de' MMMM 'às' HH:mm", {
    locale: ptBR,
  });
}
