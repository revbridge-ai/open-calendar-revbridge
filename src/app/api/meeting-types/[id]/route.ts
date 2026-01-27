import { NextRequest, NextResponse } from 'next/server';
import {
  getMeetingType,
  updateMeetingType,
  deleteMeetingType,
} from '@/lib/firebase/collections';
import { requireAuthWithUserId } from '@/lib/auth';
import { z } from 'zod';

// Schema para time slot (HH:mm)
const timeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

// Schema para disponibilidade de um dia
const dayAvailabilitySchema = z.object({
  enabled: z.boolean(),
  slots: z.array(timeSlotSchema),
});

// Schema para disponibilidade semanal
const weeklyAvailabilitySchema = z.object({
  0: dayAvailabilitySchema,
  1: dayAvailabilitySchema,
  2: dayAvailabilitySchema,
  3: dayAvailabilitySchema,
  4: dayAvailabilitySchema,
  5: dayAvailabilitySchema,
  6: dayAvailabilitySchema,
});

const updateSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  duration: z.number().min(5).max(480).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bufferBefore: z.number().min(0).max(60).optional(),
  bufferAfter: z.number().min(0).max(60).optional(),
  isActive: z.boolean().optional(),
  // Disponibilidade customizada (opcional)
  useCustomAvailability: z.boolean().optional(),
  availability: weeklyAvailabilitySchema.optional(),
  // Integracao Slack (opcional)
  slackWebhookId: z.string().nullable().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET - Protegido (admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const meetingType = await getMeetingType(userId, id);

    if (!meetingType) {
      return NextResponse.json(
        { error: 'Meeting type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(meetingType);
  } catch (error) {
    console.error('Error fetching meeting type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting type' },
      { status: 500 }
    );
  }
}

// PUT - Protegido
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await getMeetingType(userId, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Meeting type not found' },
        { status: 404 }
      );
    }

    await updateMeetingType(userId, id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating meeting type:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting type' },
      { status: 500 }
    );
  }
}

// DELETE - Protegido
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await getMeetingType(userId, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Meeting type not found' },
        { status: 404 }
      );
    }

    await deleteMeetingType(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting type:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting type' },
      { status: 500 }
    );
  }
}
