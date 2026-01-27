import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthWithUserId } from '@/lib/auth';
import { testSlackWebhook } from '@/lib/integrations';

const testSchema = z.object({
  webhookUrl: z.string().url().startsWith('https://hooks.slack.com/'),
});

// POST - Testar webhook Slack
export async function POST(request: NextRequest) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { webhookUrl } = testSchema.parse(body);

    const result = await testSlackWebhook(webhookUrl);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'URL de webhook invalida' },
        { status: 400 }
      );
    }
    console.error('Error testing Slack webhook:', error);
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    );
  }
}
