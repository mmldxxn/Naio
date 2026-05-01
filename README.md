# EchoMap

A geo-social AR app where users drop location-anchored messages ("echoes") visible only within 150 meters. Others walking nearby discover them in real time — or in AR.

**Two parallel implementations share a single Firebase backend:**
- `echomap-web/` — Next.js 14 PWA (feature-complete, deployable today)
- `echomap/` — Flutter app (Android + iOS, MVP feature set)

---

## Table of Contents

1. [Technical Architecture Overview](#1-technical-architecture-overview)
2. [Data Models & Firestore Schema](#2-data-models--firestore-schema)
3. [Web App Deep Dive (Next.js PWA)](#3-web-app-deep-dive-nextjs-pwa)
4. [Flutter App Deep Dive](#4-flutter-app-deep-dive)
5. [Feature Comparison: Web vs Flutter](#5-feature-comparison-web-vs-flutter)
6. [Deploy: Web App to Vercel (Free)](#6-deploy-web-app-to-vercel-free)
7. [Deploy: Flutter App (Android APK)](#7-deploy-flutter-app-android-apk)
8. [Firebase Setup Reference](#8-firebase-setup-reference)
9. [Local Development](#9-local-development)

---

## 1. Technical Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│                                                         │
│   echomap-web/          echomap/                        │
│   Next.js 14 PWA        Flutter 3.11                    │
│   (TypeScript)          (Dart)                          │
│   Leaflet + A-Frame     flutter_map                     │
│   AR.js (WebXR)         (no AR yet)                     │
└────────────┬───────────────────┬────────────────────────┘
             │                   │
             │  Firebase SDK v11  │  Firebase SDK v3
             │                   │
┌────────────▼───────────────────▼────────────────────────┐
│                  FIREBASE PROJECT                        │
│                  echomap-e68fe                           │
│                                                         │
│   ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│   │  Firestore   │  │  Firebase     │  │  Firebase   │ │
│   │  (database)  │  │  Auth         │  │  Storage    │ │
│   │              │  │  Google/Apple │  │  (images)   │ │
│   │  /users      │  │  /Meta        │  │  /echoes/   │ │
│   │  /echoes     │  │               │  │             │ │
│   └──────────────┘  └───────────────┘  └─────────────┘ │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │  Firebase Cloud Messaging (FCM)                  │  │
│   │  Push notifications for nearby echoes           │  │
│   └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Why a single Firebase project for both apps?

Both apps write to and read from the same `echoes` and `users` Firestore collections. An echo dropped from the Flutter app is immediately visible in the web PWA, and vice versa. This unified backend is intentional: it means even early users on different platforms share the same social graph and content pool.

### Why Next.js for the web app?

Next.js is used primarily for its App Router (file-based routing), SSR capability, and first-class PWA support. However, because Firebase Auth and Leaflet both require the browser DOM, most pages are rendered client-side. The real benefit is the `@ducanh2912/next-pwa` integration, which uses Workbox to generate a service worker that caches map tiles offline and enables the "Add to Home Screen" install flow.

### Why Flutter for mobile?

Flutter compiles to native Android/iOS with a single codebase. For a solo founder, this halves the mobile development surface. The Flutter app currently targets feature parity with a simple "drop and discover" loop, with AR, image uploads, and privacy controls planned as follow-up features once web validates the core concept.

---

## 2. Data Models & Firestore Schema

### Collections

#### `users/{uid}`

Upserted on first login by both clients.

| Field | Type | Notes |
|-------|------|-------|
| `uid` | string | Firebase Auth UID, also the document ID |
| `displayName` | string | From OAuth provider |
| `photoUrl` | string? | Provider avatar URL |
| `email` | string? | Provider email |
| `createdAt` | Timestamp | Server-side, set on first write only |
| `fcmToken` | string? | Web only — FCM device token for push notifications |

#### `echoes/{echoId}`

Auto-generated document ID. Written by either client; readable by both.

| Field | Type | Web | Flutter | Notes |
|-------|------|-----|---------|-------|
| `creatorId` | string | ✓ | ✓ | Firebase Auth UID |
| `creatorName` | string | ✓ | ✓ | Denormalized display name |
| `creatorPhotoUrl` | string? | ✓ | ✓ | Denormalized avatar URL |
| `text` | string? | ✓ | ✓ | Max 280 chars |
| `imageUrl` | string? | ✓ | — | Firebase Storage download URL |
| `lat` | number | ✓ | ✓ | WGS84 latitude |
| `lng` | number | ✓ | ✓ | WGS84 longitude |
| `createdAt` | Timestamp | ✓ | ✓ | |
| `viewCount` | number | ✓ | ✓ | Incremented with `FieldValue.increment(1)` |
| `privacy` | string | ✓ | — | `'public' \| 'friends' \| 'private'` |
| `visibleAfter` | Timestamp? | ✓ | — | Time capsule unlock date |

### Why denormalize creator fields into each echo document?

Firestore does not support JOINs. To show creator name and avatar on an echo marker without a second read per echo, we store them inline at write time. The tradeoff is stale data if the user later changes their display name, which is acceptable for a prototype.

### Why filter by lat/lng bounding box in the query, then re-filter by haversine in the client?

Firestore only supports range filters on a single field per query. Querying a precise circular radius requires a geo-library (like GeoHash or Firestore GeoPoint). Instead, both clients query a square bounding box (`lat ± 0.002`, roughly ±220m) and then apply the exact 150m haversine filter in JavaScript/Dart. This keeps the implementation simple at the cost of fetching a small number of extra documents outside the circle.

---

## 3. Web App Deep Dive (Next.js PWA)

### Directory Structure

```
echomap-web/
├── public/
│   ├── manifest.json              # PWA identity (name, icons, start_url)
│   ├── firebase-messaging-sw.js   # FCM background message handler
│   ├── icons/
│   │   ├── icon-192.svg
│   │   └── icon-512.svg
│   └── swe-worker-*.js            # Auto-generated Workbox service worker
├── src/
│   ├── app/                       # Next.js App Router pages
│   │   ├── layout.tsx             # Root layout: metadata, viewport, SW registration
│   │   ├── page.tsx               # / → redirects to /map
│   │   ├── login/page.tsx         # OAuth login page
│   │   ├── map/page.tsx           # Main app: map + drop/discover
│   │   ├── ar/page.tsx            # AR viewer page
│   │   └── profile/page.tsx       # User profile + my echoes
│   ├── components/
│   │   ├── AuthGuard.tsx          # Route protection: redirects to /login if not authed
│   │   ├── MapView.tsx            # Leaflet map with echo markers
│   │   ├── ARViewer.tsx           # A-Frame/AR.js scene
│   │   ├── DropEchoModal.tsx      # Create echo form
│   │   ├── EchoDetailModal.tsx    # View echo details
│   │   ├── EditEchoModal.tsx      # Edit echo form
│   │   ├── BottomNav.tsx          # Tab navigation
│   │   ├── SearchBar.tsx          # Geocoding search input
│   │   ├── InstallPrompt.tsx      # PWA install banner
│   │   └── Portal.tsx             # React portal for modals
│   ├── hooks/
│   │   ├── useAuth.ts             # Firebase Auth + OAuth providers
│   │   ├── useGeolocation.ts      # GPS watchPosition wrapper
│   │   ├── useNearbyEchoes.ts     # Firestore nearby echo subscription
│   │   └── useGeofencing.ts       # 50m notification trigger
│   ├── lib/
│   │   ├── firebase.ts            # Firebase app init + service exports
│   │   ├── echoes.ts              # All Firestore CRUD for echoes
│   │   ├── notifications.ts       # FCM token setup + local notifications
│   │   └── haversine.ts           # Great-circle distance calculator
│   └── types/
│       └── index.ts               # TypeScript interfaces: Echo, AppUser
├── next.config.mjs                # PWA config + Workbox cache strategies
├── tailwind.config.ts             # Dark purple theme
└── .env.local.example             # Required environment variables template
```

### PWA Service Worker & Offline Map Tiles

`next.config.mjs` configures two Workbox runtime caching strategies:

```js
// Map tile caching — why: map tiles are static PNGs that don't change.
// CacheFirst means the app loads tiles from cache without hitting the network,
// making the map usable offline for previously visited areas.
{
  urlPattern: /https:\/\/[abc]\.basemaps\.cartocdn\.com\/.*/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'map-tiles',
    expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 }
  }
}
```

This is critical for a mobile-first app where users may have spotty cell coverage outdoors.

### Auth Flow

```
User taps "Sign in with Google"
  → useAuth.signInWithGoogle()
  → signInWithPopup(auth, GoogleAuthProvider)
  → Firebase returns User object
  → setDoc(users/{uid}, {...}, { merge: true })  // upsert, never overwrites
  → AuthGuard unblocks, router.push('/map')
```

Apple and Meta follow the same pattern using `OAuthProvider('apple.com')` and `FacebookAuthProvider`.

### Echo Discovery Flow

```
useGeolocation (watchPosition, 5s cache, 15s timeout)
  → position { lat, lng }
  → useNearbyEchoes(lat, lng)
    → subscribeNearbyEchoes(lat, lng, uid, callback)
      → Firestore query: echoes WHERE lat > (lat-0.002) AND lat < (lat+0.002)
      → onSnapshot (real-time listener)
        → filter: haversine(user, echo) ≤ 150m
        → filter: privacy gates (private/friends only shown to creator)
        → filter: visibleAfter ≤ now (time capsule)
      → callback(Echo[])
  → MapView renders markers
  → useGeofencing checks haversine ≤ 50m → local notification
```

### AR Viewer

The AR page dynamically loads A-Frame 1.4.2 and AR.js 3.4.5 from CDN (no SSR, because these libraries manipulate `document` directly). Each nearby echo becomes a `<a-entity gps-new-entity-place>` positioned at its real-world GPS coordinate. The browser's camera feed + device orientation combine to overlay floating labels on the physical world.

AR.js requires HTTPS — this is one reason the web app must be deployed (not just run locally) for AR to work.

### FCM Push Notifications

Background push notifications use a two-part setup:

1. **`/public/firebase-messaging-sw.js`** — A separate service worker that runs outside the app's JavaScript context. It receives FCM messages when the browser tab is closed and shows OS-level notifications. It learns the Firebase config by receiving a `postMessage` from the main thread on first load (because service workers cannot read environment variables).

2. **`src/lib/notifications.ts`** — On app load, registers the service worker, gets an FCM token with the VAPID key, and stores it to `users/{uid}.fcmToken`. A server-side function (not yet implemented) would use this token to send targeted pushes.

---

## 4. Flutter App Deep Dive

### Directory Structure

```
echomap/
├── lib/
│   ├── main.dart                  # App entry: Firebase init, MultiProvider, theme
│   ├── firebase_options.dart      # Auto-generated by FlutterFire CLI
│   ├── models/
│   │   ├── echo.dart              # Echo data class + Firestore serialization
│   │   └── app_user.dart          # AppUser data class
│   ├── screens/
│   │   ├── login_screen.dart      # Google Sign-In
│   │   ├── home_screen.dart       # IndexedStack shell + BottomNavigationBar
│   │   ├── map_screen.dart        # FlutterMap + real-time nearby echoes
│   │   ├── drop_echo_screen.dart  # Create echo form
│   │   ├── echo_detail_screen.dart# View echo details
│   │   └── profile_screen.dart    # User info + my echoes
│   └── services/
│       ├── auth_service.dart      # GoogleSignIn + Firebase Auth + user upsert
│       └── echo_service.dart      # Firestore CRUD + location
├── android/
│   └── app/
│       ├── build.gradle.kts       # compileSdk, minSdk, applicationId
│       └── google-services.json   # [gitignored] Firebase Android config
└── ios/
    └── Runner/
        └── GoogleService-Info.plist # [gitignored] Firebase iOS config
```

### Why `google-services.json` and `GoogleService-Info.plist` are gitignored

These files contain platform-specific Firebase API keys. While they are technically client-side (bundled into the app binary), keeping them out of public version control prevents automated credential scrapers from finding them and exhausting quota or abusing the Firebase project. To build the app locally, download them from Firebase Console → Project Settings → Your apps.

### State Management

The app uses `provider` for dependency injection with two `ChangeNotifierProvider`s at the root:
- `AuthService` — exposes `userStream` and `currentUser`
- `EchoService` — exposes location and Firestore methods

`main.dart` wraps the app in a `StreamBuilder` on `authStateChanges()`. When the stream emits a user, it shows `HomeScreen`; when null, it shows `LoginScreen`. No routing library needed for this binary auth state.

### Location & Distance

`EchoService.getCurrentPosition()` requests `LocationPermission` at runtime, then calls `Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high)`. Nearby echoes are streamed via a Firestore `onSnapshot` with a lat bounding box, then filtered client-side using `Geolocator.distanceBetween()` (Vincenty formula) to 150m.

---

## 5. Feature Comparison: Web vs Flutter

| Feature | Web PWA | Flutter |
|---------|---------|---------|
| Auth providers | Google, Apple, Meta | Google only |
| Drop echo (text) | ✓ | ✓ |
| Drop echo (image) | ✓ Storage, 10MB | Not yet |
| Privacy levels | public / friends / private | Not yet |
| Time capsule | ✓ visibleAfter | Not yet |
| Edit echo | ✓ | Not yet |
| Delete echo | ✓ | Not yet |
| AR viewer | ✓ A-Frame + AR.js | Not yet |
| Push notifications | ✓ FCM + Local | Not yet |
| Map search | ✓ Geocoding | Not yet |
| Offline map tiles | ✓ Workbox cache | OSM default |
| PWA installable | ✓ | N/A (native) |
| Discovery radius | 150m | 150m |
| Geofencing alerts | 50m local notification | Not yet |

---

## 6. Deploy: Web App to Vercel (Free)

Vercel is the recommended host because it was built by the Next.js team. The free (Hobby) tier covers unlimited personal projects with automatic HTTPS — which is required for geolocation APIs and AR.js to work in mobile browsers.

### Step 1 — Push the repo to GitHub

The code must be in a GitHub (or GitLab/Bitbucket) repo for Vercel's Git integration to auto-deploy on every push.

```bash
# Already done if you followed the setup above.
# Verify:
git remote -v
# Should show: origin  https://github.com/mmldxxn/Naio.git
```

### Step 2 — Create a Vercel account

Go to [vercel.com](https://vercel.com) and sign up with your GitHub account. Authorizing with GitHub lets Vercel read your repos and set up webhooks automatically — so every `git push` to `main` triggers a new deployment.

### Step 3 — Import the project

1. Click **Add New → Project**
2. Select the `Naio` repository
3. **Set Root Directory to `echomap-web`**

   > This is critical. Vercel will scan the root for `package.json` to detect the framework. Since `echomap-web/` is a subdirectory, you must tell Vercel where the Next.js project lives. Without this, the build will fail because the root has no `package.json`.

4. Framework Preset will auto-detect as **Next.js** — leave it.
5. Build Command: `npm run build` (default, no change needed)
6. Output Directory: `.next` (default, no change needed)

### Step 4 — Add Environment Variables

Go to **Settings → Environment Variables** and add all of the following. These values come from Firebase Console → Project Settings → Your apps → Web app config.

> Environment variables are needed because the Firebase credentials must never be hardcoded in source — they differ between dev and prod environments and the `.env.local` file is gitignored. Vercel injects them at build time as `process.env.NEXT_PUBLIC_*`, which Next.js embeds into the client bundle.

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web app → apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same → authDomain (e.g. `echomap-e68fe.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same → projectId (e.g. `echomap-e68fe`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same → storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same → messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same → appId |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Same → measurementId |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Key pair |

Set all variables for **Production**, **Preview**, and **Development** environments.

### Step 5 — Register the Web App in Firebase Console

> This step is required if you haven't already. Firebase Auth, Firestore, and Storage will reject requests from an app that isn't registered in the Firebase project. The `APP_ID` and `API_KEY` above only exist after this step.

1. Firebase Console → Project `echomap-e68fe` → Project Settings → Your apps
2. Click **Add app → Web (</> icon)**
3. Name it `echomap-web`
4. Check **"Also set up Firebase Hosting"** only if you want Firebase Hosting as an alternative — not required for Vercel
5. Copy the config values into Vercel's environment variables (Step 4)

### Step 6 — Authorize the Vercel domain in Firebase Auth

> Firebase Auth blocks OAuth sign-ins from domains that aren't whitelisted. Without this step, Google/Apple/Meta sign-in will fail with an "unauthorized domain" error after deployment.

1. Firebase Console → Authentication → Settings → Authorized domains
2. Click **Add domain**
3. Add your Vercel URL: `your-project-name.vercel.app`
4. If you add a custom domain later, add it here too

### Step 7 — Deploy

Click **Deploy**. Vercel runs `npm run build`, which:
1. Compiles TypeScript
2. Builds the Next.js app
3. Runs `@ducanh2912/next-pwa` to generate the Workbox service worker and inject runtime cache configs
4. Outputs static + server files to `.next/`

When complete, you get a live URL like `https://naio-xxxx.vercel.app`.

### Step 8 — Verify the deployment

Open the URL on a mobile browser and check:

- [ ] `/login` loads and Google sign-in completes without "unauthorized domain" error
- [ ] `/map` loads, requests location permission, and shows the map
- [ ] The browser's "Add to Home Screen" banner appears (PWA install prompt)
- [ ] On HTTPS, dropping an echo creates a Firestore document visible in Firebase Console
- [ ] `/ar` activates the camera (requires location permission granted)

### Step 9 — Configure Firestore Security Rules (important before sharing publicly)

The default Firestore rules may be open or fully locked. Set them to match the app's access patterns:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Anyone authenticated can read echoes
    // Only the creator can write/delete their own echoes
    match /echoes/{echoId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.creatorId == request.auth.uid;
      allow update, delete: if request.auth != null
                             && resource.data.creatorId == request.auth.uid;
    }

    // Users can only read/write their own user document
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Deploy these in Firebase Console → Firestore → Rules.

---

## 7. Deploy: Flutter App (Android APK)

For a free prototype, skip the Play Store. Use Firebase App Distribution to share the APK directly with testers.

### Prerequisites

- Flutter SDK 3.11+ installed (`flutter --version`)
- Android Studio with an Android SDK
- Java 17 (required by `build.gradle.kts`)
- `google-services.json` placed at `echomap/android/app/google-services.json` (download from Firebase Console → Project Settings → Android app)

### Step 1 — Add `google-services.json`

> This file is gitignored because it contains Firebase credentials. You must download it manually and place it in the Android app directory. The `com.google.gms.google-services` Gradle plugin reads it at build time to inject Firebase configuration.

Download from: Firebase Console → Project Settings → Your apps → Android app (`com.echomap.echomap`) → Download `google-services.json`

```bash
# Place it here:
echomap/android/app/google-services.json
```

### Step 2 — Add `GoogleService-Info.plist` (iOS only)

> Same reasoning as above, but for iOS. Required by the `GoogleService-Info.plist` reader in the Firebase iOS SDK.

Download from: Firebase Console → Project Settings → Your apps → iOS app → Download `GoogleService-Info.plist`

```bash
# Place it here:
echomap/ios/Runner/GoogleService-Info.plist
```

### Step 3 — Install dependencies

```bash
cd echomap
flutter pub get
```

> `flutter pub get` resolves the `pubspec.yaml` dependency tree and downloads packages to the local pub cache. This is equivalent to `npm install`.

### Step 4 — Build release APK

```bash
flutter build apk --release
```

> `--release` enables Dart's AOT (ahead-of-time) compiler, which produces native ARM code rather than interpreted bytecode. Release builds are smaller, faster, and have ProGuard minification applied. Debug builds cannot be uploaded to Firebase App Distribution.

Output: `echomap/build/app/outputs/flutter-apk/app-release.apk`

### Step 5 — Distribute via Firebase App Distribution

1. Firebase Console → App Distribution
2. Select the Android app
3. Upload `app-release.apk`
4. Add tester emails
5. Testers receive an email with a download link — no Play Store needed

---

## 8. Firebase Setup Reference

### Firebase Project

**Project ID**: `echomap-e68fe`
**Registered apps**: Android (`com.echomap.echomap`), iOS (`com.echomap.echomap`), Web (add manually)

### Services Used

| Service | Purpose |
|---------|---------|
| Firebase Auth | OAuth identity (Google, Apple, Meta) |
| Firestore | Real-time NoSQL database for echoes and users |
| Firebase Storage | Echo image uploads (web only, 10MB limit) |
| Firebase Cloud Messaging | Push notifications for nearby echoes (web) |
| Firebase App Distribution | APK distribution for Flutter beta |

### Storage Rules

The `echomap-web/storage.rules` file defines who can read/write images:

```
match /echoes/{echoId}/{fileName} {
  allow read;                              // Public: anyone can view images
  allow write: if request.auth != null     // Must be logged in
    && request.resource.size < 10 * 1024 * 1024  // Under 10MB
    && request.resource.contentType.matches('image/.*');  // Images only
  allow delete: if request.auth != null
    && resource.metadata.creatorId == request.auth.uid;  // Owner only
}
```

Deploy storage rules from Firebase Console → Storage → Rules, or via Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only storage
```

### FCM VAPID Key

Required for web push notifications. Generate at:
Firebase Console → Project Settings → Cloud Messaging → Web configuration → Generate key pair

The key is stored as `NEXT_PUBLIC_FIREBASE_VAPID_KEY` and passed to `getToken(messaging, { vapidKey })` in `src/lib/notifications.ts`. Without it, FCM token generation silently fails and push notifications don't work, but the rest of the app is unaffected.

---

## 9. Local Development

### Web App

```bash
# 1. Install dependencies
cd echomap-web
npm install

# 2. Copy env template and fill in Firebase values
cp .env.local.example .env.local
# Edit .env.local with your Firebase web app config

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

> Geolocation and AR require HTTPS in production, but work on `localhost` in Chrome/Safari for development because browsers treat localhost as a secure origin.

> The service worker (`swe-worker-*.js`) is disabled in dev mode (`disable: process.env.NODE_ENV === 'development'` in `next.config.mjs`). This prevents stale cache issues during development.

### Flutter App

```bash
# 1. Place google-services.json (see Step 1 in Flutter deploy section)

# 2. Install dependencies
cd echomap
flutter pub get

# 3. Run on connected device or emulator
flutter run

# 4. Run on specific device
flutter devices          # list available devices
flutter run -d <device>
```

> The Flutter app reads Firebase config from `lib/firebase_options.dart` (committed) and `android/app/google-services.json` (gitignored). Both must be present to build.

---

## Environment Variables Quick Reference

Copy `echomap-web/.env.local.example` to `echomap-web/.env.local` and fill in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=           # from Firebase Console → Project Settings → Web app
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=echomap-e68fe.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=echomap-e68fe
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=echomap-e68fe.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=50110561113
NEXT_PUBLIC_FIREBASE_APP_ID=           # from Firebase Console → Web app → App ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=   # from Firebase Console → Web app → Measurement ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY=        # from Firebase Console → Cloud Messaging → Web Push
```
