import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserProfile } from '@/lib/firebase/collections';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  const userId = cookieStore.get('user_id');

  if (!session || session.value !== 'authenticated' || !userId) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const profile = await getUserProfile(userId.value);

    if (!profile) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: profile.username,
        displayName: profile.displayName,
        photoUrl: profile.photoUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ authenticated: false });
  }
}
