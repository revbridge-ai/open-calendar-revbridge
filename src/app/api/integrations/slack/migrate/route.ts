import { NextResponse } from 'next/server';
import { requireAuthWithUserId } from '@/lib/auth';
import { migrateSlackIntegration, checkNeedsMigration } from '@/lib/firebase/slack-webhooks';

// POST - Executar migração
export async function POST() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const needsMigration = await checkNeedsMigration(userId);

    if (!needsMigration) {
      return NextResponse.json({
        success: true,
        message: 'No migration needed'
      });
    }

    await migrateSlackIntegration(userId);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (error) {
    console.error('[POST /api/integrations/slack/migrate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate Slack integration' },
      { status: 500 }
    );
  }
}

// GET - Verificar se precisa migração
export async function GET() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const needsMigration = await checkNeedsMigration(userId);

    return NextResponse.json({ needsMigration });
  } catch (error) {
    console.error('[GET /api/integrations/slack/migrate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
