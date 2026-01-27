// ============================================
// INTEGRACOES
// ============================================

export type IntegrationType = 'slack';

export interface IntegrationBase {
  type: IntegrationType;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Configuracao Slack Webhook (DEPRECATED - usar SlackWebhook)
export interface SlackWebhookConfig extends IntegrationBase {
  type: 'slack';
  webhookUrl: string;
  channelName?: string;
  notifyOnBooking: boolean;
  notifyOnCancel: boolean;
}

// Novo: Webhook individual do Slack (multi-webhook support)
export interface SlackWebhook {
  id: string;
  name: string;
  webhookUrl: string;
  channelName?: string;
  enabled: boolean;
  notifyOnBooking: boolean;
  notifyOnCancel: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SlackWebhookCreate = Omit<SlackWebhook, 'id' | 'createdAt' | 'updatedAt'>;
export type SlackWebhookUpdate = Partial<SlackWebhookCreate>;

// Metadata de migracao
export interface SlackIntegrationMeta {
  migrated: boolean;
  migratedAt?: Date;
}

export type Integration = SlackWebhookConfig;

// Payload para mensagens Slack
export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
}

// Evento para trigger de integracoes
export interface BookingEvent {
  type: 'booking.created' | 'booking.cancelled';
  booking: {
    id: string;
    meetingTypeId: string;
    guestName: string;
    guestEmail: string;
    guestCompany: string;
    meetingTypeName: string;
    startTime: Date;
    endTime: Date;
    guestTimezone: string;
    guestNotes?: string | null;
    additionalGuests?: Array<{
      name: string;
      email: string;
    }>;
  };
  owner: {
    displayName: string;
    username: string;
    timezone: string;
  };
}
