import FirebaseFirestore
import Network

/// Watches real device connectivity and mirrors it into the Firestore SDK's
/// own network switch, so cached announcements stay viewable offline and
/// any posts made while offline are queued and flushed automatically the
/// moment the device reconnects — with no manual retry logic required.
final class OfflineSync {
    static let shared = OfflineSync()
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "campusconnect.network-monitor")

    private init() {
        // Firestore persists a local cache to disk by default on iOS, so
        // reads (e.g. AnnouncementService.announcements) keep working even
        // with zero connectivity; this only needs to be explicit if you
        // want to change the cache size limit:
        let settings = FirestoreSettings()
        settings.cacheSettings = PersistentCacheSettings(sizeBytes: NSNumber(value: FirestoreCacheSizeUnlimited))
        Firestore.firestore().settings = settings
    }

    func startMonitoring() {
        monitor.pathUpdateHandler = { path in
            let db = Firestore.firestore()
            if path.status == .satisfied {
                // Back online: flush the SDK's local write queue automatically.
                db.enableNetwork { error in
                    if let error { print("Failed to re-enable network: \(error)") }
                }
            } else {
                // Offline: reads still succeed from cache; writes queue locally
                // instead of failing, and get sent once enableNetwork runs again.
                db.disableNetwork { error in
                    if let error { print("Failed to disable network: \(error)") }
                }
            }
        }
        monitor.start(queue: queue)
    }
}
