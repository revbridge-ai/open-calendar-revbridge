import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase/admin';

interface TeamMember {
  username: string;
  displayName: string;
  photoUrl: string | null;
  title: string | null;
}

// GET - Lista todos os membros do time (público)
export async function GET() {
  try {
    initAdmin();
    const db = getFirestore();

    // Buscar todos os usernames
    const usernamesSnapshot = await db.collection('usernames').get();

    const members: TeamMember[] = [];

    for (const doc of usernamesSnapshot.docs) {
      const { userId } = doc.data();
      const username = doc.id;

      // Buscar perfil do usuário
      const profileDoc = await db.doc(`users/${userId}/profile/data`).get();

      if (profileDoc.exists) {
        const profile = profileDoc.data()!;
        members.push({
          username,
          displayName: profile.displayName || username,
          photoUrl: profile.photoUrl || null,
          title: profile.title || null,
        });
      }
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json([], { status: 200 });
  }
}
