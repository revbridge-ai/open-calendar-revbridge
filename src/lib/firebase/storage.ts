import { getStorage } from 'firebase-admin/storage';
import { initAdmin } from './admin';

/**
 * Faz upload de uma imagem a partir de uma URL e retorna a URL pública
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  destinationPath: string
): Promise<string> {
  initAdmin();

  // Baixar a imagem
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determinar content type
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  // Upload para Firebase Storage
  const bucket = getStorage().bucket();
  const file = bucket.file(destinationPath);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000', // Cache por 1 ano
    },
  });

  // Bucket já é público (allUsers:objectViewer configurado)
  // Retornar URL pública
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  return publicUrl;
}

/**
 * Faz upload da foto de perfil do usuário
 */
export async function uploadProfilePhoto(
  userId: string,
  imageUrl: string
): Promise<string> {
  const destinationPath = `profile-photos/${userId}.jpg`;
  return uploadImageFromUrl(imageUrl, destinationPath);
}

/**
 * Deleta a foto de perfil do usuário
 */
export async function deleteProfilePhoto(userId: string): Promise<void> {
  initAdmin();

  const bucket = getStorage().bucket();
  const file = bucket.file(`profile-photos/${userId}.jpg`);

  try {
    await file.delete();
  } catch (error) {
    // Ignorar se o arquivo não existir
    console.log('Photo not found or already deleted:', error);
  }
}
