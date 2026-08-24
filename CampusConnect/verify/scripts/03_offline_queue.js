// Proves Q3: offline caching + queuing unsent posts + automatic
// synchronization once connectivity returns. We use the Firestore
// SDK's own network toggle (disableNetwork/enableNetwork) to simulate
// going offline mid-session, which is exactly the mechanism the SDK
// uses internally when a real device loses connectivity.
const { signInWithEmailAndPassword } = require("firebase/auth");
const {
  collection,
  addDoc,
  getDocs,
  disableNetwork,
  enableNetwork,
  serverTimestamp,
} = require("firebase/firestore");
const { auth, db } = require("./firebaseConfig");

async function main() {
  const cred = await signInWithEmailAndPassword(auth, "a.ponce@campus.edu", "Student#2026!");

  console.log("Going offline (simulated loss of connectivity)...");
  await disableNetwork(db);

  console.log("Composing a post while offline — it queues locally instead of failing:");
  const pendingWrite = addDoc(collection(db, "announcements"), {
    authorId: cred.user.uid,
    authorRole: "student",
    text: "Anyone have notes from today's lecture? (posted while offline)",
    channel: "general",
    createdAt: serverTimestamp(),
  });
  console.log("addDoc() returned immediately — write is pending in the local queue, UI is not blocked.");

  // Read while offline: served from cache, proving cached data remains viewable.
  const cachedSnap = await getDocs(collection(db, "announcements"));
  console.log(`Read while offline succeeded from cache: ${cachedSnap.size} cached announcement(s) still visible.`);

  await new Promise((r) => setTimeout(r, 500));
  console.log("Reconnecting...");
  await enableNetwork(db);

  const docRef = await pendingWrite; // resolves once the queued write actually commits
  console.log(`Queued post synced automatically after reconnect, server doc id=${docRef.id}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
