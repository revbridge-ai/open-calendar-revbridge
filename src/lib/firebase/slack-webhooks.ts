import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { initAdmin } from './admin';
import { SlackWebhook, SlackWebhookCreate, SlackWebhookUpdate, SlackWebhookConfig } from '@/types';

// ============================================
// SLACK WEBHOOKS CRUD (Multi-Webhook Support)
// ============================================

export async function getSlackWebhooks(userId: string): Promise<SlackWebhook[]> {
  initAdmin();
  const db = getFirestore();
  const snapshot = await db.collection(`users/${userId}/slack-webhooks`).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      webhookUrl: data.webhookUrl,
      channelName: data.channelName,
      enabled: data.enabled,
      notifyOnBooking: data.notifyOnBooking,
      notifyOnCancel: data.notifyOnCancel,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as SlackWebhook;
  });
}

export async function getSlackWebhook(
  userId: string,
  webhookId: string
): Promise<SlackWebhook | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(`users/${userId}/slack-webhooks/${webhookId}`).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    webhookUrl: data.webhookUrl,
    channelName: data.channelName,
    enabled: data.enabled,
    notifyOnBooking: data.notifyOnBooking,
    notifyOnCancel: data.notifyOnCancel,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as SlackWebhook;
}

export async function createSlackWebhook(
  userId: string,
  data: SlackWebhookCreate
): Promise<SlackWebhook> {
  initAdmin();
  const db = getFirestore();
  const id = nanoid();
  const docRef = db.doc(`users/${userId}/slack-webhooks/${id}`);

  const webhookData = {
    name: data.name,
    webhookUrl: data.webhookUrl,
    channelName: data.channelName || null,
    enabled: data.enabled,
    notifyOnBooking: data.notifyOnBooking,
    notifyOnCancel: data.notifyOnCancel,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await docRef.set(webhookData);

  return {
    id,
    name: data.name,
    webhookUrl: data.webhookUrl,
    channelName: data.channelName,
    enabled: data.enabled,
    notifyOnBooking: data.notifyOnBooking,
    notifyOnCancel: data.notifyOnCancel,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateSlackWebhook(
  userId: string,
  webhookId: string,
  data: SlackWebhookUpdate
): Promise<void> {
  initAdmin();
  const db = getFirestore();
  const docRef = db.doc(`users/${userId}/slack-webhooks/${webhookId}`);

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
  if (data.channelName !== undefined) updateData.channelName = data.channelName || null;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.notifyOnBooking !== undefined) updateData.notifyOnBooking = data.notifyOnBooking;
  if (data.notifyOnCancel !== undefined) updateData.notifyOnCancel = data.notifyOnCancel;

  await docRef.update(updateData);
}

export async function deleteSlackWebhook(userId: string, webhookId: string): Promise<void> {
  initAdmin();
  const db = getFirestore();
  await db.doc(`users/${userId}/slack-webhooks/${webhookId}`).delete();
}

// ============================================
// MIGRATION
// ============================================

export async function checkNeedsMigration(userId: string): Promise<boolean> {
  initAdmin();
  const db = getFirestore();

  // Verifica se existe config antiga
  const oldDoc = await db.doc(`users/${userId}/integrations/slack`).get();
  if (!oldDoc.exists) return false;

  // Verifica se já foi migrado
  const metaDoc = await db.doc(`users/${userId}/integrations/slack-meta`).get();
  if (metaDoc.exists && metaDoc.data()?.migrated === true) return false;

  return true;
}

export async function migrateSlackIntegration(userId: string): Promise<void> {
  initAdmin();
  const db = getFirestore();

  // Buscar config antiga
  const oldDoc = await db.doc(`users/${userId}/integrations/slack`).get();
  if (!oldDoc.exists) {
    console.log('[Migration] No old Slack config found for user:', userId);
    return;
  }

  // Verificar se já foi migrado
  const metaDoc = await db.doc(`users/${userId}/integrations/slack-meta`).get();
  if (metaDoc.exists && metaDoc.data()?.migrated === true) {
    console.log('[Migration] User already migrated:', userId);
    return;
  }

  const oldConfig = oldDoc.data() as SlackWebhookConfig;

  // Criar webhook default com dados da config antiga
  await createSlackWebhook(userId, {
    name: 'Canal Padrão',
    webhookUrl: oldConfig.webhookUrl,
    channelName: oldConfig.channelName,
    enabled: oldConfig.enabled,
    notifyOnBooking: oldConfig.notifyOnBooking,
    notifyOnCancel: oldConfig.notifyOnCancel,
  });

  // Marcar como migrado
  await db.doc(`users/${userId}/integrations/slack-meta`).set({
    migrated: true,
    migratedAt: Timestamp.now(),
  });

  console.log('[Migration] Successfully migrated Slack integration for user:', userId);
}
