// ============================================
// USUÁRIOS
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  username: string;           // parte antes do @ (ex: "rafael")
  displayName: string;
  photoUrl: string | null;
  title: string | null;       // cargo (ex: "CEO", "CTO")
  bio: string | null;         // mini bio
  cancellationMessage: string | null;  // mensagem personalizada de cancelamento
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  timezone: string;            // "America/Sao_Paulo"
  minimumNotice: number;       // horas (ex: 24)
  maxDaysAhead: number;        // dias (ex: 60)
  googleCalendarId: string;    // "primary"
  availability: WeeklyAvailability;
  updatedAt: Date;
}

// Índice global para lookup de username -> userId
export interface UsernameIndex {
  userId: string;
}

// ============================================
// DISPONIBILIDADE
// ============================================

export interface TimeSlot {
  start: string;  // "09:00" (HH:mm)
  end: string;    // "12:00"
}

export interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklyAvailability {
  0: DayAvailability;  // Domingo
  1: DayAvailability;  // Segunda
  2: DayAvailability;  // Terça
  3: DayAvailability;  // Quarta
  4: DayAvailability;  // Quinta
  5: DayAvailability;  // Sexta
  6: DayAvailability;  // Sábado
}

// ============================================
// CONFIGURAÇÕES
// ============================================

export interface Settings {
  ownerName: string;
  ownerEmail: string;
  timezone: string;            // "America/Sao_Paulo"
  minimumNotice: number;       // horas (ex: 24)
  maxDaysAhead: number;        // dias (ex: 60)
  googleCalendarId: string;    // "primary"
  availability: WeeklyAvailability;
  updatedAt: Date;
}

// ============================================
// TIPOS DE REUNIÃO
// ============================================

export interface MeetingType {
  id: string;
  userId: string;              // ID do dono (multi-user)
  slug: string;                // "consultoria"
  name: string;                // "Consultoria"
  description: string;
  duration: number;            // minutos
  color: string;               // "#3B82F6"
  bufferBefore: number;        // minutos
  bufferAfter: number;         // minutos
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Disponibilidade customizada (opcional - usa global se nao definida)
  useCustomAvailability?: boolean;
  availability?: WeeklyAvailability;
  // Integracao Slack (opcional - null = sem notificacao)
  slackWebhookId?: string | null;
}

export type MeetingTypeCreate = Omit<MeetingType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type MeetingTypeUpdate = Partial<MeetingTypeCreate>;

// ============================================
// AGENDAMENTOS
// ============================================

export interface Booking {
  id: string;
  ownerId: string;             // ID do dono do meeting type
  meetingTypeId: string;
  meetingTypeName: string;
  guestName: string;
  guestEmail: string;
  guestCompany: string;        // Nome da empresa
  guestNotes: string | null;
  additionalGuests?: Array<{   // Convidados adicionais (opcional)
    name: string;
    email: string;
  }>;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
  googleEventId: string;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
}

export interface BookingCreate {
  ownerUsername: string;       // username do dono (para lookup)
  meetingTypeId: string;
  startTime: string;           // ISO 8601
  guestName: string;
  guestEmail: string;
  guestCompany: string;        // Nome da empresa
  guestNotes?: string;
  additionalGuests?: Array<{   // Convidados adicionais (opcional)
    name: string;
    email: string;
  }>;
  guestTimezone: string;
}

// ============================================
// TOKENS OAUTH
// ============================================

export interface StoredTokens {
  accessToken: string;         // encriptado
  refreshToken: string;        // encriptado
  expiresAt: number;           // timestamp
  updatedAt: Date;
}

// ============================================
// SLOTS DISPONÍVEIS (resposta API)
// ============================================

export interface AvailableSlot {
  time: string;                // "09:00"
  datetime: string;            // ISO 8601
}

// ============================================
// EVENTOS GOOGLE CALENDAR
// ============================================

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

// ============================================
// INTEGRACOES
// ============================================

export * from './integrations';
