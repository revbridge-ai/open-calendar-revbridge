import { cookies } from 'next/headers';

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || '';

export async function requireAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  return session?.value === 'authenticated';
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const email = cookieStore.get('user_email');

  return email?.value || null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id');

  return userId?.value || null;
}

export async function requireAuthWithUserId(): Promise<{ isAuth: boolean; userId: string | null }> {
  const isAuth = await requireAuth();
  const userId = await getCurrentUserId();

  return { isAuth, userId };
}

export function isAllowedEmail(email: string): boolean {
  // If no domain restriction, allow all emails
  if (!ALLOWED_DOMAIN) return true;

  const domain = email.split('@')[1]?.toLowerCase();
  return domain === ALLOWED_DOMAIN;
}

export function extractUsername(email: string): string {
  return email.split('@')[0].toLowerCase();
}
