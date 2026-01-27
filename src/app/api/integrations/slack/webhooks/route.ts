import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthWithUserId } from '@/lib/auth';
import { getSlackWebhooks, createSlackWebhook } from '@/lib/firebase/slack-webhooks';

const webhookCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome deve ter no máximo 50 caracteres'),
  webhookUrl: z.string().url('URL inválida').startsWith('https://hooks.slack.com/', 'URL deve ser do Slack'),
  channelName: z.string().optional(),
  enabled: z.boolean(),
  notifyOnBooking: z.boolean(),
  notifyOnCancel: z.boolean(),
});

// GET - Listar todos os webhooks
export async function GET() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const webhooks = await getSlackWebhooks(userId);
    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('[GET /api/integrations/slack/webhooks] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST - Criar novo webhook
export async function POST(request: NextRequest) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = webhookCreateSchema.parse(body);

    const webhook = await createSlackWebhook(userId, data);

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[POST /api/integrations/slack/webhooks] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
