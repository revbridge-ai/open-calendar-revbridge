import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initAdmin } from './admin';
import {
  Settings,
  UserSettings,
  UserProfile,
  UsernameIndex,
  MeetingType,
  MeetingTypeCreate,
  MeetingTypeUpdate,
  Booking,
  WeeklyAvailability,
} from '@/types';
import { nanoid } from 'nanoid';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  0: { enabled: false, slots: [] }, // Domingo
  1: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  2: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  3: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  4: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  5: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  6: { enabled: false, slots: [] }, // Sábado
};

// ============================================
// USER PROFILE
// ============================================

export async function createUserProfile(data: {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
}): Promise<UserProfile> {
  initAdmin();
  const db = getFirestore();

  const username = data.email.split('@')[0].toLowerCase();
  const now = Timestamp.now();

  const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof Timestamp.now>;
    updatedAt: ReturnType<typeof Timestamp.now>;
  } = {
    id: data.id,
    email: data.email,
    username,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    title: null,
    bio: null,
    cancellationMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  // Salvar perfil do usuário
  await db.doc(`users/${data.id}/profile/data`).set(profile);

  // Criar índice de username
  await db.doc(`usernames/${username}`).set({ userId: data.id });

  return {
    ...data,
    username,
    title: null,
    bio: null,
    cancellationMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`users/${userId}/profile/data`).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as UserProfile;
}

export async function getUserIdByUsername(username: string): Promise<string | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`usernames/${username.toLowerCase()}`).get();

  if (!doc.exists) return null;

  const data = doc.data() as UsernameIndex;
  return data.userId;
}

export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const userId = await getUserIdByUsername(username);
  if (!userId) return null;
  return getUserProfile(userId);
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'photoUrl' | 'title' | 'bio' | 'cancellationMessage'>>
): Promise<void> {
  initAdmin();
  const db = getFirestore();

  await db.doc(`users/${userId}/profile/data`).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// USER SETTINGS
// ============================================

export async function getUserSettings(userId: string): Promise<UserSettings> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`users/${userId}/settings/config`).get();

  if (!doc.exists) {
    // Retorna configurações padrão
    return {
      timezone: 'America/Sao_Paulo',
      minimumNotice: 24,
      maxDaysAhead: 60,
      googleCalendarId: 'primary',
      availability: DEFAULT_AVAILABILITY,
      updatedAt: new Date(),
    };
  }

  const data = doc.data()!;
  return {
    ...data,
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as UserSettings;
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  initAdmin();
  const db = getFirestore();

  await db.doc(`users/${userId}/settings/config`).set(
    {
      ...settings,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

// ============================================
// LEGACY SETTINGS (deprecated - para compatibilidade)
// ============================================

export async function getSettings(): Promise<Settings> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc('settings/config').get();

  if (!doc.exists) {
    return {
      ownerName: '',
      ownerEmail: '',
      timezone: 'America/Sao_Paulo',
      minimumNotice: 24,
      maxDaysAhead: 60,
      googleCalendarId: 'primary',
      availability: DEFAULT_AVAILABILITY,
      updatedAt: new Date(),
    };
  }

  const data = doc.data()!;
  return {
    ...data,
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Settings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  initAdmin();
  const db = getFirestore();

  await db.doc('settings/config').set(
    {
      ...settings,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

// ============================================
// MEETING TYPES
// ============================================

export async function getMeetingTypes(userId: string): Promise<MeetingType[]> {
  initAdmin();
  const db = getFirestore();
  const snapshot = await db
    .collection(`users/${userId}/meeting-types`)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      userId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as MeetingType;
  });
}

export async function getActiveMeetingTypes(userId: string): Promise<MeetingType[]> {
  initAdmin();
  const db = getFirestore();
  // Query simples sem orderBy para evitar necessidade de índice composto
  const snapshot = await db
    .collection(`users/${userId}/meeting-types`)
    .where('isActive', '==', true)
    .get();

  const meetingTypes = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      userId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as MeetingType;
  });

  // Ordenar por createdAt em memória
  return meetingTypes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getMeetingType(userId: string, id: string): Promise<MeetingType | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`users/${userId}/meeting-types/${id}`).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    userId,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as MeetingType;
}

export async function getMeetingTypeBySlug(userId: string, slug: string): Promise<MeetingType | null> {
  initAdmin();
  const db = getFirestore();
  const snapshot = await db
    .collection(`users/${userId}/meeting-types`)
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    userId,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as MeetingType;
}

export async function createMeetingType(userId: string, data: MeetingTypeCreate): Promise<MeetingType> {
  initAdmin();
  const db = getFirestore();
  const id = nanoid();

  const meetingType = {
    ...data,
    id,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.doc(`users/${userId}/meeting-types/${id}`).set(meetingType);

  return {
    ...data,
    id,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateMeetingType(
  userId: string,
  id: string,
  data: MeetingTypeUpdate
): Promise<void> {
  initAdmin();
  const db = getFirestore();

  await db.doc(`users/${userId}/meeting-types/${id}`).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteMeetingType(userId: string, id: string): Promise<void> {
  initAdmin();
  const db = getFirestore();
  await db.doc(`users/${userId}/meeting-types/${id}`).delete();
}

// ============================================
// BOOKINGS
// ============================================

export async function getBookings(userId: string): Promise<Booking[]> {
  initAdmin();
  const db = getFirestore();
  const snapshot = await db
    .collection(`users/${userId}/bookings`)
    .orderBy('startTime', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      ownerId: userId,
      startTime: data.startTime?.toDate() || new Date(),
      endTime: data.endTime?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Booking;
  });
}

export async function getUpcomingBookings(userId: string, maxResults = 10): Promise<Booking[]> {
  initAdmin();
  const db = getFirestore();
  const now = Timestamp.now();

  const snapshot = await db
    .collection(`users/${userId}/bookings`)
    .where('startTime', '>=', now)
    .orderBy('startTime', 'asc')
    .limit(maxResults * 2)
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        ownerId: userId,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Booking;
    })
    .filter((booking) => booking.status === 'confirmed')
    .slice(0, maxResults);
}

export async function getBookingsForDate(userId: string, date: string): Promise<Booking[]> {
  initAdmin();
  const db = getFirestore();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const snapshot = await db
    .collection(`users/${userId}/bookings`)
    .where('startTime', '>=', Timestamp.fromDate(startOfDay))
    .where('startTime', '<=', Timestamp.fromDate(endOfDay))
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      ownerId: userId,
      startTime: data.startTime?.toDate() || new Date(),
      endTime: data.endTime?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Booking;
  });
}

export async function getBookingsInRange(userId: string, start: Date, end: Date): Promise<Booking[]> {
  initAdmin();
  const db = getFirestore();

  const snapshot = await db
    .collection(`users/${userId}/bookings`)
    .where('startTime', '>=', Timestamp.fromDate(start))
    .where('startTime', '<=', Timestamp.fromDate(end))
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        ownerId: userId,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Booking;
    })
    .filter((booking) => booking.status === 'confirmed');
}

export async function createBooking(
  userId: string,
  data: Omit<Booking, 'id' | 'ownerId' | 'createdAt'>
): Promise<Booking> {
  initAdmin();
  const db = getFirestore();
  const id = nanoid();

  const booking = {
    ...data,
    id,
    ownerId: userId,
    startTime: Timestamp.fromDate(data.startTime),
    endTime: Timestamp.fromDate(data.endTime),
    createdAt: Timestamp.now(),
  };

  await db.doc(`users/${userId}/bookings/${id}`).set(booking);

  return {
    ...data,
    id,
    ownerId: userId,
    createdAt: new Date(),
  };
}

export async function updateBookingStatus(
  userId: string,
  id: string,
  status: 'confirmed' | 'cancelled'
): Promise<void> {
  initAdmin();
  const db = getFirestore();

  await db.doc(`users/${userId}/bookings/${id}`).update({ status });
}

export async function getBooking(userId: string, id: string): Promise<Booking | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`users/${userId}/bookings/${id}`).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    ownerId: userId,
    startTime: data.startTime?.toDate() || new Date(),
    endTime: data.endTime?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
  } as Booking;
}
