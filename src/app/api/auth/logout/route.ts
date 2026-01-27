import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();

  cookieStore.delete('session');
  cookieStore.delete('user_email');

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL));
}

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete('session');
  cookieStore.delete('user_email');

  return NextResponse.json({ success: true });
}
