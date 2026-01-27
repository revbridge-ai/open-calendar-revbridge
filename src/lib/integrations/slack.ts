import { SlackWebhookConfig, SlackMessage, BookingEvent } from '@/types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { enUS } from 'date-fns/locale';

/**
 * Envia mensagem para Slack via Webhook URL direta
 * Nao lanca erro - apenas loga falhas (nao deve bloquear booking)
 */
export async function sendSlackNotificationToUrl(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('[Slack] Webhook failed:', response.status, await response.text());
      return false;
    }

    console.log('[Slack] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Slack] Error sending notification:', error);
    return false;
  }
}

/**
 * Envia mensagem para Slack via Webhook (legacy - usa config antiga)
 * Nao lanca erro - apenas loga falhas (nao deve bloquear booking)
 * @deprecated Use sendSlackNotificationToUrl em vez disso
 */
export async function sendSlackNotification(
  config: SlackWebhookConfig,
  message: SlackMessage
): Promise<boolean> {
  return sendSlackNotificationToUrl(config.webhookUrl, message);
}

/**
 * Testa conexao com webhook Slack
 */
export async function testSlackWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'RevBridge Calendar conectado com sucesso!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Teste de conexao bem-sucedido!*\n\nSeu Slack esta conectado ao RevBridge Calendar. Voce recebera notificacoes de novos agendamentos e cancelamentos aqui.',
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Webhook retornou erro: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Nao foi possivel conectar ao webhook' };
  }
}

/**
 * Formata mensagem de novo booking para Slack
 */
export function formatBookingCreatedMessage(event: BookingEvent): SlackMessage {
  const { booking, owner } = event;
  const ownerTimezone = owner.timezone || 'America/Sao_Paulo';

  // Converter para timezone do owner
  const startInOwnerTz = toZonedTime(booking.startTime, ownerTimezone);
  const endInOwnerTz = toZonedTime(booking.endTime, ownerTimezone);

  const formattedDate = format(startInOwnerTz, 'EEEE, MMMM d', { locale: enUS });
  const formattedTime = `${format(startInOwnerTz, 'h:mm a')} - ${format(endInOwnerTz, 'h:mm a')}`;

  // Construir lista de convidados adicionais
  let additionalGuestsText = '';
  if (booking.additionalGuests && booking.additionalGuests.length > 0) {
    const guestsList = booking.additionalGuests
      .map(g => `  • ${g.name} (${g.email})`)
      .join('\n');
    additionalGuestsText = `\n*Additional Guests:*\n${guestsList}`;
  }

  return {
    text: `📅 *New Booking*\n\n*Meeting:* ${booking.meetingTypeName}\n*Organizer:* ${booking.guestName}\n*Company:* ${booking.guestCompany}\n*Email:* ${booking.guestEmail}${additionalGuestsText}\n*Date:* ${formattedDate}\n*Time:* ${formattedTime}`,
  };
}

/**
 * Formata mensagem de cancelamento para Slack
 */
export function formatBookingCancelledMessage(event: BookingEvent): SlackMessage {
  const { booking, owner } = event;
  const ownerTimezone = owner.timezone || 'America/Sao_Paulo';

  // Converter para timezone do owner
  const startInOwnerTz = toZonedTime(booking.startTime, ownerTimezone);
  const endInOwnerTz = toZonedTime(booking.endTime, ownerTimezone);

  const formattedDate = format(startInOwnerTz, 'EEEE, MMMM d', { locale: enUS });
  const formattedTime = `${format(startInOwnerTz, 'h:mm a')} - ${format(endInOwnerTz, 'h:mm a')}`;

  // Construir lista de convidados adicionais
  let additionalGuestsText = '';
  if (booking.additionalGuests && booking.additionalGuests.length > 0) {
    const guestsList = booking.additionalGuests
      .map(g => `  • ${g.name} (${g.email})`)
      .join('\n');
    additionalGuestsText = `\n*Additional Guests:*\n${guestsList}`;
  }

  return {
    text: `❌ *Booking Cancelled*\n\n*Meeting:* ${booking.meetingTypeName}\n*Organizer:* ${booking.guestName}\n*Company:* ${booking.guestCompany}\n*Email:* ${booking.guestEmail}${additionalGuestsText}\n*Date:* ${formattedDate}\n*Time:* ${formattedTime}`,
  };
}
