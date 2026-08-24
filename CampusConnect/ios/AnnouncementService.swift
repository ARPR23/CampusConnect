import FirebaseAuth
import FirebaseFirestore

struct Announcement: Identifiable, Codable {
    @DocumentID var id: String?
    var authorId: String
    var authorRole: String
    var text: String
    var channel: String
    @ServerTimestamp var createdAt: Timestamp?
}

final class AnnouncementService: ObservableObject {
    @Published var announcements: [Announcement] = []

    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?

    /// Creates a new announcement. authorId MUST equal the signed-in uid —
    /// firestore.rules rejects any write where it doesn't, which is what
    /// stops one user from posting as someone else.
    func post(text: String, channel: String) throws {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "CampusConnect", code: 401,
                           userInfo: [NSLocalizedDescriptionKey: "No validated session"])
        }
        let announcement: [String: Any] = [
            "authorId": user.uid,
            "authorRole": UserDefaults.standard.string(forKey: "role") ?? "student",
            "text": text,
            "channel": channel,
            "createdAt": FieldValue.serverTimestamp()
        ]
        // addDocument returns immediately even if the device is offline —
        // the write is queued locally by the SDK and flushed automatically
        // once connectivity returns (see OfflineSync.swift).
        db.collection("announcements").addDocument(data: announcement)
    }

    /// Real-time listener: every device with this attached gets pushed the
    /// updated announcement list the moment Firestore commits a change,
    /// which is what gives Campus Connect its Slack-like "instant" feel.
    func startListening() {
        listener = db.collection("announcements")
            .order(by: "channel")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }
                self?.announcements = documents.compactMap {
                    try? $0.data(as: Announcement.self)
                }
            }
    }

    func stopListening() {
        listener?.remove()
    }
}
