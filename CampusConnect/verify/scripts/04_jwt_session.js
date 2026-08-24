// Proves Q4 (session half): Firebase Auth's ID token IS a JWT. This
// shows generation (on sign-in), inspecting its claims/expiry, and a
// forced refresh producing a new token — the three things the
// assignment asks for under "JWT-based session handling".
const jwt = require("jsonwebtoken");
const { signInWithEmailAndPassword } = require("firebase/auth");
const { auth } = require("./firebaseConfig");

async function main() {
  const cred = await signInWithEmailAndPassword(auth, "a.ponce@campus.edu", "Student#2026!");

  const token = await cred.user.getIdToken();
  const claims = jwt.decode(token); // decode only — client never needs to verify its own token's signature

  console.log("--- Firebase ID token (JWT) claims ---");
  console.log(`sub (uid):   ${claims.sub}`);
  console.log(`email:       ${claims.email}`);
  console.log(`iat (issued):  ${new Date(claims.iat * 1000).toISOString()}`);
  console.log(`exp (expiry):  ${new Date(claims.exp * 1000).toISOString()}`);
  console.log(`lifetime:      ${claims.exp - claims.iat} seconds (Firebase default is 3600s)`);

  console.log("\nForcing a token refresh (as you would after a 401, or proactively before expiry)...");
  const refreshedToken = await cred.user.getIdToken(true); // true = force refresh
  console.log(`Token changed after refresh: ${refreshedToken !== token}`);
  const refreshedClaims = jwt.decode(refreshedToken);
  console.log(`New iat: ${new Date(refreshedClaims.iat * 1000).toISOString()}`);

  process.exitCode = 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
