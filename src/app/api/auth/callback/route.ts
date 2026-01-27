import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserInfo } from '@/lib/google/auth';
import { saveTokens } from '@/lib/google/tokens';
import { cookies } from 'next/headers';
import { isAllowedEmail } from '@/lib/auth';
import {
  createUserProfile,
  getUserIdByUsername,
  getUserProfile,
  updateUserProfile,
} from '@/lib/firebase/collections';
import { uploadProfilePhoto } from '@/lib/firebase/storage';
import { nanoid } from 'nanoid';

function getBaseUrl(request: NextRequest): string {
  // Em produção, usar o header X-Forwarded-Host ou NEXTAUTH_URL
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback para variável de ambiente ou request.url
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const baseUrl = getBaseUrl(request);

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl));
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Obter informações do usuário
    const userInfo = await getUserInfo(tokens.access_token!);

    // Verificar se email é do domínio permitido
    if (!userInfo.email || !isAllowedEmail(userInfo.email)) {
      console.error('Unauthorized email domain:', userInfo.email);
      return NextResponse.redirect(new URL('/login?error=unauthorized_domain', baseUrl));
    }

    // Extrair username do email
    const username = userInfo.email.split('@')[0].toLowerCase();

    // Verificar se usuário já existe
    let userId = await getUserIdByUsername(username);

    if (!userId) {
      // Criar novo usuário
      userId = nanoid();

      // Fazer upload da foto para o Storage (se tiver)
      let photoUrl: string | null = null;
      if (userInfo.picture) {
        try {
          photoUrl = await uploadProfilePhoto(userId, userInfo.picture);
          console.log('Profile photo uploaded:', photoUrl);
        } catch (error) {
          console.error('Failed to upload profile photo:', error);
          // Continua sem foto se falhar
        }
      }

      await createUserProfile({
        id: userId,
        email: userInfo.email,
        displayName: userInfo.name || username,
        photoUrl,
      });
      console.log('New user created:', { userId, username, email: userInfo.email });
    } else {
      // Usuário existe, atualizar foto se necessário
      const profile = await getUserProfile(userId);
      if (profile && userInfo.picture) {
        // Verificar se a foto atual é do Storage (URL pública permanente)
        const isStoragePhoto = profile.photoUrl?.includes('storage.googleapis.com');

        // Se não tiver foto ou a foto atual for do Google (não do Storage), fazer upload
        if (!profile.photoUrl || !isStoragePhoto) {
          try {
            const newPhotoUrl = await uploadProfilePhoto(userId, userInfo.picture);
            await updateUserProfile(userId, { photoUrl: newPhotoUrl });
            console.log('Updated photo for user:', { userId, username, photoUrl: newPhotoUrl });
          } catch (error) {
            console.error('Failed to update profile photo:', error);
          }
        }
        console.log('Existing user logged in:', { userId, username, email: userInfo.email });
      }
    }

    // Salvar tokens no Firestore (path do usuário)
    await saveTokens(userId, tokens);

    // Criar cookies de sessão
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    };

    cookieStore.set('session', 'authenticated', cookieOptions);
    cookieStore.set('user_email', userInfo.email, cookieOptions);
    cookieStore.set('user_id', userId, cookieOptions);

    return NextResponse.redirect(new URL('/dashboard', baseUrl));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl));
  }
}
