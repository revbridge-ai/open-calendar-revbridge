import { NextRequest, NextResponse } from 'next/server';
import { getMeetingTypes, createMeetingType } from '@/lib/firebase/collections';
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

const createSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  description: z.string(),
  duration: z.number().min(5).max(480),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  bufferBefore: z.number().min(0).max(60),
  bufferAfter: z.number().min(0).max(60),
  isActive: z.boolean(),
  // Disponibilidade customizada (opcional)
  useCustomAvailability: z.boolean().optional(),
  availability: weeklyAvailabilitySchema.optional(),
  // Integracao Slack (opcional)
  slackWebhookId: z.string().nullable().optional(),
});

// GET - Protegido (lista todos os meeting types do usuário)
export async function GET() {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const types = await getMeetingTypes(userId);
    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching meeting types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting types' },
      { status: 500 }
    );
  }
}

// POST - Protegido (criar tipo)
export async function POST(request: NextRequest) {
  const { isAuth, userId } = await requireAuthWithUserId();
  if (!isAuth || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    const meetingType = await createMeetingType(userId, data);
    return NextResponse.json(meetingType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating meeting type:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting type' },
      { status: 500 }
    );
  }
}
