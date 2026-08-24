// Shared Firebase init, wired to the LOCAL emulators (no real Firebase
// project or network access needed — this is what lets us actually
// execute and prove out the Auth/Firestore logic on a machine with no
// Xcode/iOS toolchain available).
const { initializeApp } = require("firebase/app");
const { getAuth, connectAuthEmulator } = require("firebase/auth");
const { getFirestore, connectFirestoreEmulator } = require("firebase/firestore");

// "demo-" prefix tells the emulator suite this is a fake, offline-only
// project id — no real Google Cloud project or credentials required.
const app = initializeApp({
  apiKey: "demo-key",
  projectId: "demo-campus-connect",
  authDomain: "demo-campus-connect.firebaseapp.com",
});

const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

module.exports = { app, auth, db };
