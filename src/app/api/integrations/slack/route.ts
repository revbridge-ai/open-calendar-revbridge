import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthWithUserId } from '@/lib/auth';
import { getSlackIntegration, saveSlackIntegration, deleteIntegration } from '@/lib/firebase/integrations';

const slackConfigSchema = z.object({
  webhookUrl: z.string().url().startsWith('https://hooks.slack.com/'),
  channelName: z.string().optional(),
  enabled: z.boolean(),
  notifyOnBooking: z.boolean(),
  notifyOnCancel: z.boolean(),
});

// GET - Obter configuracao Slack
export async function GET() {
  console.log('[GET /api/integrations/slack] Starting...');

  const { isAuth, userId } = await requireAuthWithUserId();
  console.log('[GET /api/integrations/slack] Auth:', { isAuth, userId });

  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[GET /api/integrations/slack] Fetching config...');
    const config = await getSlackIntegration(userId);
    console.log('[GET /api/integrations/slack] Config:', config ? 'found' : 'not found');
    return NextResponse.json(config || { configured: false });
  } catch (error) {
    console.error('[GET /api/integrations/slack] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Slack integration' },
      { status: 500 }
    );
  }
}

// PUT - Salvar configuracao Slack
export async function PUT(request: NextRequest) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = slackConfigSchema.parse(body);

    await saveSlackIntegration(userId, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error saving Slack integration:', error);
    return NextResponse.json(
      { error: 'Failed to save Slack integration' },
      { status: 500 }
    );
  }
}

// DELETE - Remover integracao Slack
export async function DELETE() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteIntegration(userId, 'slack');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Slack integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete Slack integration' },
      { status: 500 }
    );
  }
}
