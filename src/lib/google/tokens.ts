import { getFirestore } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '@/lib/encryption';
import { StoredTokens } from '@/types';
import { refreshAccessToken } from './auth';
import { initAdmin } from '@/lib/firebase/admin';
import { getCurrentUserId } from '@/lib/auth';

// Path para tokens do usuário
function getTokensPath(userId: string): string {
  return `users/${userId}/tokens/oauth`;
}

export async function saveTokens(
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }
): Promise<void> {
  initAdmin();
  const db = getFirestore();

  const data: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (tokens.access_token) {
    data.accessToken = encrypt(tokens.access_token);
  }
  if (tokens.refresh_token) {
    data.refreshToken = encrypt(tokens.refresh_token);
  }
  if (tokens.expiry_date) {
    data.expiresAt = tokens.expiry_date;
  }

  await db.doc(getTokensPath(userId)).set(data, { merge: true });
}

export async function getTokens(userId: string): Promise<StoredTokens | null> {
  initAdmin();
  const db = getFirestore();
  const doc = await db.doc(getTokensPath(userId)).get();

  if (!doc.exists) return null;

  const data = doc.data() as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    updatedAt: { toDate: () => Date };
  };

  return {
    accessToken: decrypt(data.accessToken),
    refreshToken: decrypt(data.refreshToken),
    expiresAt: data.expiresAt,
    updatedAt: data.updatedAt.toDate(),
  };
}

export async function getValidAccessToken(userId?: string): Promise<string> {
  // Se userId não foi passado, tenta pegar do cookie (para APIs admin)
  const resolvedUserId = userId || (await getCurrentUserId());

  if (!resolvedUserId) {
    throw new Error('Not authenticated - no user ID');
  }

  const tokens = await getTokens(resolvedUserId);

  if (!tokens) {
    throw new Error('Not authenticated - no tokens');
  }

  // Se token expira em menos de 5 minutos, refresh
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (tokens.expiresAt - now < fiveMinutes) {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    await saveTokens(resolvedUserId, newTokens);
    return newTokens.access_token!;
  }

  return tokens.accessToken;
}

export async function hasValidTokens(userId?: string): Promise<boolean> {
  try {
    const resolvedUserId = userId || (await getCurrentUserId());
    if (!resolvedUserId) return false;

    const tokens = await getTokens(resolvedUserId);
    return tokens !== null && tokens.refreshToken !== undefined;
  } catch {
    return false;
  }
}
