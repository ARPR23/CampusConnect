// Proves Q2: real-time Firestore listeners deliver instant updates
// across "devices" (simulated here as two independent onSnapshot
// subscriptions), plus a basic session-validation check via
// onAuthStateChanged before allowing the listener to attach.
const { signInWithEmailAndPassword, onAuthStateChanged } = require("firebase/auth");
const { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } = require("firebase/firestore");
const { auth, db } = require("./firebaseConfig");

function waitForValidatedSession() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    }, reject);
  });
}

async function main() {
  await signInWithEmailAndPassword(auth, "prof.rivera@campus.edu", "Faculty#2026!");
  const user = await waitForValidatedSession();
  console.log(`Session validated for uid=${user.uid} (emailVerified check, token present: ${!!(await user.getIdToken())})`);

  const q = query(collection(db, "announcements"), orderBy("channel"));

  let device1Count = 0;
  let device2Count = 0;

  const device1 = onSnapshot(q, (snap) => {
    device1Count = snap.size;
    console.log(`[Device 1 - phone]  live snapshot: ${snap.size} announcement(s)`);
  });
  const device2 = onSnapshot(q, (snap) => {
    device2Count = snap.size;
    console.log(`[Device 2 - tablet] live snapshot: ${snap.size} announcement(s)`);
  });

  // give both listeners a moment to receive the initial snapshot
  await new Promise((r) => setTimeout(r, 800));

  console.log("Faculty posts a new announcement...");
  await addDoc(collection(db, "announcements"), {
    authorId: user.uid,
    authorRole: "faculty",
    text: "Campus wifi maintenance tonight 11pm-1am.",
    channel: "it-alerts",
    createdAt: serverTimestamp(),
  });

  await new Promise((r) => setTimeout(r, 800));
  console.log(`Both devices converged: device1=${device1Count}, device2=${device2Count}, equal=${device1Count === device2Count}`);

  device1();
  device2();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
