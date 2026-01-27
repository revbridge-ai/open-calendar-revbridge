import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initAdmin } from './admin';
import { Integration, IntegrationType, SlackWebhookConfig } from '@/types';

// ============================================
// INTEGRATIONS CRUD
// ============================================

export async function getIntegration(
  userId: string,
  type: IntegrationType
): Promise<Integration | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`users/${userId}/integrations/${type}`).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Integration;
}

export async function getSlackIntegration(userId: string): Promise<SlackWebhookConfig | null> {
  const integration = await getIntegration(userId, 'slack');
  return integration as SlackWebhookConfig | null;
}

export async function getAllIntegrations(userId: string): Promise<Integration[]> {
  initAdmin();
  const db = getFirestore();
  const snapshot = await db.collection(`users/${userId}/integrations`).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Integration;
  });
}

export async function saveSlackIntegration(
  userId: string,
  config: Omit<SlackWebhookConfig, 'type' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  initAdmin();
  const db = getFirestore();
  const docRef = db.doc(`users/${userId}/integrations/slack`);
  const existing = await docRef.get();

  const data = {
    ...config,
    type: 'slack',
    updatedAt: Timestamp.now(),
    ...(existing.exists ? {} : { createdAt: Timestamp.now() }),
  };

  await docRef.set(data, { merge: true });
}

export async function deleteIntegration(userId: string, type: IntegrationType): Promise<void> {
  initAdmin();
  const db = getFirestore();
  await db.doc(`users/${userId}/integrations/${type}`).delete();
}
