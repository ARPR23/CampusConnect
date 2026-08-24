# CampusConnect

A campus announcements app built for a Mobile Applications coursework assignment — an iOS client (Swift) backed by Firebase Authentication and Firestore, plus a set of Node.js scripts that verify the backend behavior against Firebase's local emulator suite.

## What it does

Students and faculty sign up with a role (`student` or `faculty`), log in, and post/read channel-based announcements in real time. Firestore security rules enforce that a user can only post as themselves and can't claim a role they don't have.

## iOS client (`ios/`)

Swift services for the app:

- `AuthService.swift` — registration/login against Firebase Auth, writes the matching user profile to Firestore.
- `AnnouncementService.swift` — real-time announcement feed via a Firestore snapshot listener; posts are written with `authorId` locked to the signed-in user.
- `JWTSessionManager.swift` — stores Firebase's JWT ID token in the iOS Keychain and force-refreshes it before it expires.
- `KeychainHelper.swift` — thin wrapper around iOS Keychain Services for secure token storage.
- `OfflineSync.swift` — mirrors real device connectivity into Firestore's network switch, so cached reads keep working and queued writes flush automatically on reconnect.

These are the app-side service files; there's no bundled Xcode project in this repo — add one if you want to run the UI rather than just the backend verification scripts below.

## Backend verification (`verify/`)

Node scripts that exercise the Firestore security rules and offline behavior against the Firebase Local Emulator Suite. No real Firebase project or credentials required — `firebaseConfig.js` points at `127.0.0.1` with a `demo-` project ID, so nothing in this repo talks to a live backend.

- `01_auth_and_firestore.js` — registration, login, and two attempts to forge/spoof a faculty post (both correctly rejected by `firestore.rules`).
- `02_realtime_sync.js` — two simulated devices confirm they converge on the same data via `onSnapshot`.
- `03_offline_queue.js` — simulates a dropped connection mid-write and confirms the write queues locally and syncs automatically on reconnect.
- `04_jwt_session.js` — decodes the Firebase ID token's JWT claims and confirms a forced refresh issues a new token.

### Running the verification scripts

```
cd verify
npm install
npm run emulators          # in one terminal
npm run demo:auth          # in a second terminal (or demo:realtime, demo:offline, demo:jwt)
```

## Status

Coursework project, not a shipped app.
