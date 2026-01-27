import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthWithUserId } from '@/lib/auth';
import { getSlackWebhook, updateSlackWebhook, deleteSlackWebhook } from '@/lib/firebase/slack-webhooks';

const webhookUpdateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome deve ter no máximo 50 caracteres').optional(),
  webhookUrl: z.string().url('URL inválida').startsWith('https://hooks.slack.com/', 'URL deve ser do Slack').optional(),
  channelName: z.string().optional(),
  enabled: z.boolean().optional(),
  notifyOnBooking: z.boolean().optional(),
  notifyOnCancel: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET - Obter webhook específico
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const webhook = await getSlackWebhook(userId, id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json(webhook);
  } catch (error) {
    console.error('[GET /api/integrations/slack/webhooks/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar webhook
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verificar se webhook existe
    const existing = await getSlackWebhook(userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = webhookUpdateSchema.parse(body);

    await updateSlackWebhook(userId, id, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[PUT /api/integrations/slack/webhooks/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE - Remover webhook
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verificar se webhook existe
    const existing = await getSlackWebhook(userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    await deleteSlackWebhook(userId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/integrations/slack/webhooks/:id] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
