import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/collections';
import { requireAuthWithUserId } from '@/lib/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  title: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  cancellationMessage: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(userId);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      email: profile.email,
      photoUrl: profile.photoUrl,
      title: profile.title || null,
      bio: profile.bio || null,
      cancellationMessage: profile.cancellationMessage || null,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    await updateUserProfile(userId, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
