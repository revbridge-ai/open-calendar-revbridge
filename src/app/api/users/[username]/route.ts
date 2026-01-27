import { NextRequest, NextResponse } from 'next/server';
import { getUserProfileByUsername } from '@/lib/firebase/collections';

type RouteParams = { params: Promise<{ username: string }> };

// GET - Público (info pública do usuário)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { username } = await params;

  try {
    const profile = await getUserProfileByUsername(username);

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Retornar apenas dados públicos
    return NextResponse.json({
      username: profile.username,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
      title: profile.title || null,
      bio: profile.bio || null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
