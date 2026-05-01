import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Echo, Privacy } from '@/types';

const NEARBY_DELTA = 0.002; // ~220m bounding box
export const NEARBY_RADIUS_M = 150;
export const GEOFENCE_RADIUS_M = 50;

function docToEcho(id: string, d: DocumentData): Echo {
  return {
    id,
    creatorId: d.creatorId ?? '',
    creatorName: d.creatorName ?? 'Anonymous',
    creatorPhotoUrl: d.creatorPhotoUrl,
    text: d.text,
    imageUrl: d.imageUrl,
    lat: Number(d.lat),
    lng: Number(d.lng),
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    viewCount: d.viewCount ?? 0,
    privacy: d.privacy ?? 'public',
    visibleAfter: d.visibleAfter ? (d.visibleAfter as Timestamp).toDate() : undefined,
  };
}

export function subscribeNearbyEchoes(
  lat: number,
  lng: number,
  currentUid: string | null,
  onUpdate: (echoes: Echo[]) => void
): () => void {
  const q = query(
    collection(db, 'echoes'),
    where('lat', '>=', lat - NEARBY_DELTA),
    where('lat', '<=', lat + NEARBY_DELTA)
  ) as Query<DocumentData>;

  return onSnapshot(q, (snap) => {
    const now = new Date();
    const echoes = snap.docs
      .map((d) => docToEcho(d.id, d.data()))
      .filter((e) => {
        // Time capsule gate
        if (e.visibleAfter && e.visibleAfter > now) return false;
        // Privacy gate
        if (e.privacy === 'private' && e.creatorId !== currentUid) return false;
        // Friends tier: only show own echoes (full social graph requires backend rules)
        if (e.privacy === 'friends' && e.creatorId !== currentUid) return false;
        return true;
      });
    onUpdate(echoes);
  });
}

export function subscribeMyEchoes(uid: string, onUpdate: (echoes: Echo[]) => void): () => void {
  const q = query(
    collection(db, 'echoes'),
    where('creatorId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => docToEcho(d.id, d.data())));
  });
}

export async function dropEcho(params: {
  creatorId: string;
  creatorName: string;
  creatorPhotoUrl?: string;
  text?: string;
  imageFile?: File;
  lat: number;
  lng: number;
  privacy: Privacy;
  visibleAfter?: Date;
}): Promise<Echo> {
  const echoRef = doc(collection(db, 'echoes'));

  let imageUrl: string | undefined;
  if (params.imageFile) {
    const file = params.imageFile;
    if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB.');
    // Use a fixed safe filename to avoid special-character path issues
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const storageRef = ref(storage, `echoes/${echoRef.id}/image.${ext}`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    imageUrl = await getDownloadURL(storageRef);
  }

  const data: DocumentData = {
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    creatorPhotoUrl: params.creatorPhotoUrl ?? null,
    text: params.text ?? null,
    imageUrl: imageUrl ?? null,
    lat: params.lat,
    lng: params.lng,
    createdAt: Timestamp.now(),
    viewCount: 0,
    privacy: params.privacy,
    visibleAfter: params.visibleAfter ? Timestamp.fromDate(params.visibleAfter) : null,
  };

  await setDoc(echoRef, data);
  return docToEcho(echoRef.id, { ...data, createdAt: Timestamp.now() });
}

export async function incrementView(echoId: string): Promise<void> {
  await updateDoc(doc(db, 'echoes', echoId), { viewCount: increment(1) });
}

export async function deleteEcho(echoId: string): Promise<void> {
  await deleteDoc(doc(db, 'echoes', echoId));
}

export async function updateEcho(
  echoId: string,
  updates: { text?: string; privacy?: Privacy; visibleAfter?: Date | null }
): Promise<void> {
  await updateDoc(doc(db, 'echoes', echoId), {
    ...(updates.text !== undefined && { text: updates.text }),
    ...(updates.privacy !== undefined && { privacy: updates.privacy }),
    visibleAfter: updates.visibleAfter ? Timestamp.fromDate(updates.visibleAfter) : null,
  });
}
