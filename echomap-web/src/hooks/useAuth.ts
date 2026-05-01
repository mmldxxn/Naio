'use client';
import { useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function upsertUser(u: User) {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: u.displayName ?? 'Explorer',
        photoUrl: u.photoURL ?? null,
        email: u.email ?? null,
        createdAt: new Date(),
      });
    }
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await upsertUser(result.user);
    return result.user;
  }

  async function signInWithApple() {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await signInWithPopup(auth, provider);
    await upsertUser(result.user);
    return result.user;
  }

  async function signInWithMeta() {
    const result = await signInWithPopup(auth, new FacebookAuthProvider());
    await upsertUser(result.user);
    return result.user;
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return { user, loading, signInWithGoogle, signInWithApple, signInWithMeta, signOut };
}
