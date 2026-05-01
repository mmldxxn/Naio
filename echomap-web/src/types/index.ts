export type Privacy = 'public' | 'friends' | 'private';

export interface Echo {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhotoUrl?: string;
  text?: string;
  imageUrl?: string;
  lat: number;
  lng: number;
  createdAt: Date;
  viewCount: number;
  privacy: Privacy;
  visibleAfter?: Date;
}

export interface AppUser {
  uid: string;
  displayName: string;
  photoUrl?: string;
  email?: string;
}
