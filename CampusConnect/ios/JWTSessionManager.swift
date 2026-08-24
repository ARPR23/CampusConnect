import FirebaseAuth

/// Firebase Authentication issues a JWT "ID token" on every sign-in
/// (RFC 7519 format: header.payload.signature, 1-hour lifetime by
/// default). This manager stores it in the Keychain, exposes its
/// expiry, and force-refreshes it before it goes stale so API/Firestore
/// calls always carry a validated, current session token.
final class JWTSessionManager {
    static let shared = JWTSessionManager()
    private let tokenKey = "campusconnect.idToken"
    private let expiryKey = "campusconnect.idTokenExpiry"

    /// Called right after sign-in/register: mint the JWT and persist it securely.
    func persistSession(for user: FirebaseAuth.User) async throws {
        let token = try await user.getIDTokenResult()
        KeychainHelper.save(token.token, forKey: tokenKey)
        KeychainHelper.save(String(token.expirationDate.timeIntervalSince1970), forKey: expiryKey)
    }

    /// Returns a guaranteed-fresh token, refreshing it first if it's
    /// within 5 minutes of expiry (Firebase tokens expire hourly).
    func validSessionToken() async throws -> String {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "CampusConnect", code: 401,
                           userInfo: [NSLocalizedDescriptionKey: "No active session"])
        }
        if let expiryString = KeychainHelper.read(forKey: expiryKey),
           let expiry = Double(expiryString),
           Date(timeIntervalSince1970: expiry).timeIntervalSinceNow > 300 {
            return KeychainHelper.read(forKey: tokenKey) ?? ""
        }
        // Expired or about to expire: force Firebase to mint a new JWT.
        let refreshed = try await user.getIDTokenResult(forcingRefresh: true)
        KeychainHelper.save(refreshed.token, forKey: tokenKey)
        KeychainHelper.save(String(refreshed.expirationDate.timeIntervalSince1970), forKey: expiryKey)
        return refreshed.token
    }

    func clearSession() {
        KeychainHelper.delete(forKey: tokenKey)
        KeychainHelper.delete(forKey: expiryKey)
    }
}
