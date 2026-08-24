// Proves Q1: Firebase Authentication registration/login + Firestore
// integration for storing announcements, and that the security rules
// actually reject a forged post.
const {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} = require("firebase/firestore");
const { auth, db } = require("./firebaseConfig");

async function registerUser(email, password, role) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Store the profile/role in Firestore, keyed by uid (matches firestore.rules).
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    role,
    createdAt: Date.now(),
  });
  await signOut(auth);
  console.log(`Registered ${role}: ${email} (uid=${cred.user.uid})`);
  return cred.user.uid;
}

async function main() {
  const facultyUid = await registerUser("prof.rivera@campus.edu", "Faculty#2026!", "faculty");
  const studentUid = await registerUser("a.ponce@campus.edu", "Student#2026!", "student");

  // --- Login ---
  const facultyCred = await signInWithEmailAndPassword(auth, "prof.rivera@campus.edu", "Faculty#2026!");
  console.log(`Logged in as faculty, uid=${facultyCred.user.uid} matches stored uid: ${facultyCred.user.uid === facultyUid}`);

  // --- Faculty posts a legitimate announcement ---
  const ref = await addDoc(collection(db, "announcements"), {
    authorId: facultyCred.user.uid,
    authorRole: "faculty",
    text: "Midterm review session moved to Friday 3pm, Room 214.",
    channel: "general",
    createdAt: serverTimestamp(),
  });
  console.log(`Faculty announcement created: ${ref.id}`);

  // --- Security rule check: student tries to forge a post as faculty ---
  await signOut(auth);
  await signInWithEmailAndPassword(auth, "a.ponce@campus.edu", "Student#2026!");
  try {
    await addDoc(collection(db, "announcements"), {
      authorId: facultyCred.user.uid, // forged authorId, not the student's own uid
      authorRole: "faculty",
      text: "Fake announcement pretending to be faculty",
      channel: "general",
      createdAt: serverTimestamp(),
    });
    console.log("SECURITY RULE FAILED: forged post was accepted!");
  } catch (err) {
    console.log(`Security rule correctly rejected forged post: ${err.code}`);
  }

  // --- Security rule check: student tries to post with their OWN uid but
  // a spoofed "faculty" role, to make an ordinary post look official ---
  try {
    await addDoc(collection(db, "announcements"), {
      authorId: studentUid, // truthful uid this time...
      authorRole: "faculty", // ...but a spoofed role
      text: "Final exam cancelled for everyone (not really, I'm a student)",
      channel: "general",
      createdAt: serverTimestamp(),
    });
    console.log("SECURITY RULE FAILED: role-spoofed post was accepted!");
  } catch (err) {
    console.log(`Security rule correctly rejected role-spoofed post: ${err.code}`);
  }

  await signOut(auth);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
