import { NextResponse } from 'next/server';
import { requireAuthWithUserId } from '@/lib/auth';
import { getAllIntegrations } from '@/lib/firebase/integrations';

// GET - Lista todas as integracoes do usuario
export async function GET() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const integrations = await getAllIntegrations(userId);
    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}
