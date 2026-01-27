import { BookingEvent } from '@/types';
import { getMeetingType } from '@/lib/firebase/collections';
import { getSlackWebhook } from '@/lib/firebase/slack-webhooks';
import {
  sendSlackNotificationToUrl,
  formatBookingCreatedMessage,
  formatBookingCancelledMessage,
} from './slack';

/**
 * Dispara notificacoes para todas as integracoes ativas do usuario
 * Executa de forma assincrona - nao bloqueia e nao lanca erros
 */
export async function dispatchIntegrationEvent(
  userId: string,
  event: BookingEvent
): Promise<void> {
  console.log('[Integrations] Dispatching event:', event.type, 'for user:', userId);
  // Executar em background (fire-and-forget)
  processIntegrations(userId, event).catch((error) => {
    console.error('[Integrations] Error dispatching event:', error);
  });
}

async function processIntegrations(userId: string, event: BookingEvent): Promise<void> {
  // Slack - nova logica com webhook por meeting type
  try {
    // 1. Buscar meeting type para pegar slackWebhookId
    const meetingTypeId = event.booking.meetingTypeId;
    console.log('[Integrations] Fetching meeting type:', meetingTypeId);

    const meetingType = await getMeetingType(userId, meetingTypeId);
    if (!meetingType) {
      console.log('[Integrations] Meeting type not found:', meetingTypeId);
      return;
    }

    // 2. Verificar se meeting type tem webhook configurado
    if (!meetingType.slackWebhookId) {
      console.log('[Integrations] No Slack webhook configured for meeting type:', meetingType.name);
      return; // Sem notificacao - comportamento esperado
    }

    // 3. Buscar webhook especifico
    console.log('[Integrations] Fetching Slack webhook:', meetingType.slackWebhookId);
    const webhook = await getSlackWebhook(userId, meetingType.slackWebhookId);

    if (!webhook) {
      console.warn('[Integrations] Webhook not found:', meetingType.slackWebhookId);
      return; // Graceful degradation
    }

    // 4. Verificar se webhook esta ativo
    if (!webhook.enabled) {
      console.log('[Integrations] Webhook disabled:', webhook.name);
      return;
    }

    // 5. Verificar se deve notificar baseado no tipo de evento
    const shouldNotify =
      (event.type === 'booking.created' && webhook.notifyOnBooking) ||
      (event.type === 'booking.cancelled' && webhook.notifyOnCancel);

    console.log('[Integrations] Should notify:', shouldNotify, {
      eventType: event.type,
      notifyOnBooking: webhook.notifyOnBooking,
      notifyOnCancel: webhook.notifyOnCancel,
    });

    if (!shouldNotify) {
      console.log('[Integrations] Notification disabled for this event type');
      return;
    }

    // 6. Formatar e enviar mensagem
    const message =
      event.type === 'booking.created'
        ? formatBookingCreatedMessage(event)
        : formatBookingCancelledMessage(event);

    console.log('[Integrations] Sending Slack notification to:', webhook.name);
    const result = await sendSlackNotificationToUrl(webhook.webhookUrl, message);
    console.log('[Integrations] Slack notification result:', result);
  } catch (error) {
    console.error('[Integrations] Slack notification failed:', error);
    // Nao propagar erro - integracoes nao devem quebrar o fluxo principal
  }
}
