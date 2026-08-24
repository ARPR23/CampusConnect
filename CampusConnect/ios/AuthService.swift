import FirebaseAuth
import FirebaseFirestore

enum UserRole: String, Codable {
    case student
    case faculty
}

final class AuthService {
    static let shared = AuthService()
    private let db = Firestore.firestore()

    /// Registers a new user with Firebase Authentication, then creates the
    /// matching profile document in Firestore (users/{uid}) with their role,
    /// matching the schema the security rules expect.
    func register(email: String, password: String, role: UserRole) async throws -> String {
        let result = try await Auth.auth().createUser(withEmail: email, password: password)
        try await db.collection("users").document(result.user.uid).setData([
            "email": email,
            "role": role.rawValue,
            "createdAt": FieldValue.serverTimestamp()
        ])
        return result.user.uid
    }

    /// Logs an existing user in and returns their validated Firebase user.
    func login(email: String, password: String) async throws -> FirebaseAuth.User {
        let result = try await Auth.auth().signIn(withEmail: email, password: password)
        return result.user
    }

    func logout() throws {
        try Auth.auth().signOut()
    }
}
