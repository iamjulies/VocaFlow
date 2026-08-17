import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/services/database_service.dart';
import '../models/deck_model.dart';
import '../models/word_model.dart';
import 'auth_service.dart';

/// Summary result object returned after a sync cycle.
class SyncResult {
  final bool isSuccess;
  final int itemsPushed;
  final int itemsPulled;
  final DateTime timestamp;
  final String? errorMessage;
  final bool isOffline;

  const SyncResult({
    required this.isSuccess,
    required this.itemsPushed,
    required this.itemsPulled,
    required this.timestamp,
    this.errorMessage,
    this.isOffline = false,
  });

  factory SyncResult.offline([String? message]) => SyncResult(
        isSuccess: true,
        itemsPushed: 0,
        itemsPulled: 0,
        timestamp: DateTime.now(),
        isOffline: true,
        errorMessage: message ?? 'Chế độ ngoại tuyến: Không thể kết nối tới Cloud.',
      );

  factory SyncResult.failure(String error) => SyncResult(
        isSuccess: false,
        itemsPushed: 0,
        itemsPulled: 0,
        timestamp: DateTime.now(),
        errorMessage: error,
      );

  @override
  String toString() =>
      'SyncResult(success: $isSuccess, pushed: $itemsPushed, pulled: $itemsPulled, offline: $isOffline, error: $errorMessage)';
}

/// Robust Bidirectional Sync Service between local Hive storage and Cloud Firestore.
///
/// Architecture:
/// - **Offline-First**: Hive is always the source of truth for instant, zero-latency UI rendering.
/// - **Conflict-Free Replicated Data**: Resolves conflicts using Last-Write-Wins (LWW) via `updatedAt` timestamps.
/// - **Soft-Delete Tombstones**: Propagates deletions across devices using `isDeleted: true`, then cleans up.
class SyncService {
  final DatabaseService _dbService;
  final AuthService _authService;
  final FirebaseFirestore? _firestore;

  static const String _lastSyncKey = 'last_sync_timestamp';

  SyncService({
    DatabaseService? dbService,
    AuthService? authService,
    FirebaseFirestore? firestore,
  })  : _dbService = dbService ?? DatabaseService.instance,
        _authService = authService ?? AuthService(),
        _firestore = firestore ??
            (DatabaseService.instance.isFirebaseAvailable
                ? FirebaseFirestore.instance
                : null);

  /// Whether Cloud Firestore sync is currently possible on this device.
  bool get isSyncAvailable =>
      _firestore != null &&
      _dbService.isFirebaseAvailable &&
      _authService.isAuthenticated;

  /// Retrieves the last recorded successful synchronization timestamp from Hive settings.
  DateTime? getLastSyncTime() {
    final raw = _dbService.settingsBox.get(_lastSyncKey);
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  /// Sets or updates the last sync timestamp in Hive settings.
  Future<void> setLastSyncTime(DateTime time) async {
    await _dbService.settingsBox.put(_lastSyncKey, time.toIso8601String());
  }

  // ===========================================================================
  // MAIN SYNCHRONIZATION CYCLE
  // ===========================================================================

  /// Executes a complete bidirectional synchronization pass.
  Future<SyncResult> syncNow({String? targetUserId}) async {
    final userId = targetUserId ?? _authService.currentUserId;

    if (userId.isEmpty || !isSyncAvailable || _firestore == null) {
      debugPrint('[SyncService] Sync skipped: User not logged in or Firebase unavailable.');
      return SyncResult.offline();
    }

    final syncStartTime = DateTime.now();
    final lastSyncTime = getLastSyncTime();
    int totalPushed = 0;
    int totalPulled = 0;

    try {
      debugPrint('[SyncService] Starting bidirectional sync for user: $userId (Last Sync: $lastSyncTime)...');

      // -----------------------------------------------------------------------
      // 1. PUSH PHASE: Local Hive -> Cloud Firestore
      // -----------------------------------------------------------------------
      final pushedDecks = await _pushDecks(userId, lastSyncTime);
      final pushedWords = await _pushWords(userId, lastSyncTime);
      totalPushed = pushedDecks + pushedWords;

      // -----------------------------------------------------------------------
      // 2. PULL PHASE: Cloud Firestore -> Local Hive
      // -----------------------------------------------------------------------
      final pulledDecks = await _pullDecks(userId, lastSyncTime);
      final pulledWords = await _pullWords(userId, lastSyncTime);
      totalPulled = pulledDecks + pulledWords;

      // -----------------------------------------------------------------------
      // 3. FINALIZE TIMESTAMP
      // -----------------------------------------------------------------------
      await setLastSyncTime(syncStartTime);

      debugPrint('[SyncService] Sync completed successfully: Pushed $totalPushed, Pulled $totalPulled.');
      return SyncResult(
        isSuccess: true,
        itemsPushed: totalPushed,
        itemsPulled: totalPulled,
        timestamp: syncStartTime,
      );
    } catch (e, stackTrace) {
      debugPrint('[SyncService] Sync failed with error: $e\n$stackTrace');
      return SyncResult.failure(e.toString());
    }
  }

  // ===========================================================================
  // INTERNAL PUSH HELPERS
  // ===========================================================================

  Future<int> _pushDecks(String userId, DateTime? lastSyncTime) async {
    final decksBox = _dbService.decksBox;
    final allDecks = decksBox.values.toList();
    int count = 0;

    final userDecksRef = _firestore!.collection('users').doc(userId).collection('decks');
    WriteBatch batch = _firestore!.batch();
    int batchOps = 0;

    for (final deck in allDecks) {
      // Push if updated after lastSync or never uploaded
      final needsPush = lastSyncTime == null ||
          deck.updatedAt.isAfter(lastSyncTime) ||
          deck.userId.isEmpty;

      if (needsPush) {
        final docRef = userDecksRef.doc(deck.id);

        if (deck.isDeleted) {
          // Push tombstone and delete from local Hive
          batch.set(docRef, deck.copyWith(userId: userId).toFirestore(), SetOptions(merge: true));
          await decksBox.delete(deck.id);
        } else {
          final updatedDeck = deck.userId != userId ? deck.copyWith(userId: userId) : deck;
          if (deck.userId != userId) {
            await decksBox.put(deck.id, updatedDeck);
          }
          batch.set(docRef, updatedDeck.toFirestore(), SetOptions(merge: true));
        }

        count++;
        batchOps++;

        if (batchOps >= 400) {
          await batch.commit();
          batch = _firestore!.batch();
          batchOps = 0;
        }
      }
    }

    if (batchOps > 0) {
      await batch.commit();
    }

    return count;
  }

  Future<int> _pushWords(String userId, DateTime? lastSyncTime) async {
    final wordsBox = _dbService.wordsBox;
    final allWords = wordsBox.values.toList();
    int count = 0;

    final userWordsRef = _firestore!.collection('users').doc(userId).collection('words');
    WriteBatch batch = _firestore!.batch();
    int batchOps = 0;

    for (final word in allWords) {
      final needsPush = lastSyncTime == null ||
          word.updatedAt.isAfter(lastSyncTime) ||
          word.userId.isEmpty;

      if (needsPush) {
        final docRef = userWordsRef.doc(word.id);

        if (word.isDeleted) {
          batch.set(docRef, word.copyWith(userId: userId).toFirestore(), SetOptions(merge: true));
          await wordsBox.delete(word.id);
        } else {
          final updatedWord = word.userId != userId ? word.copyWith(userId: userId) : word;
          if (word.userId != userId) {
            await wordsBox.put(word.id, updatedWord);
          }
          batch.set(docRef, updatedWord.toFirestore(), SetOptions(merge: true));
        }

        count++;
        batchOps++;

        if (batchOps >= 400) {
          await batch.commit();
          batch = _firestore!.batch();
          batchOps = 0;
        }
      }
    }

    if (batchOps > 0) {
      await batch.commit();
    }

    return count;
  }

  // ===========================================================================
  // INTERNAL PULL HELPERS
  // ===========================================================================

  Future<int> _pullDecks(String userId, DateTime? lastSyncTime) async {
    final decksBox = _dbService.decksBox;
    final userDecksRef = _firestore!.collection('users').doc(userId).collection('decks');
    
    QuerySnapshot<Map<String, dynamic>> snapshot;
    if (lastSyncTime != null) {
      snapshot = await userDecksRef
          .where('updatedAt', isGreaterThanOrEqualTo: lastSyncTime.toIso8601String())
          .get();
    } else {
      snapshot = await userDecksRef.get();
    }

    int count = 0;

    for (final doc in snapshot.docs) {
      final data = doc.data();
      final remoteDeck = DeckModel.fromFirestore(data, doc.id);
      final localDeck = decksBox.get(remoteDeck.id);

      if (remoteDeck.isDeleted) {
        if (localDeck != null) {
          await decksBox.delete(remoteDeck.id);
          count++;
        }
      } else {
        // Last-Write-Wins: Overwrite local if remote is newer or doesn't exist
        if (localDeck == null || remoteDeck.updatedAt.isAfter(localDeck.updatedAt) || remoteDeck.updatedAt == localDeck.updatedAt) {
          await decksBox.put(remoteDeck.id, remoteDeck);
          count++;
        }
      }
    }

    return count;
  }

  Future<int> _pullWords(String userId, DateTime? lastSyncTime) async {
    final wordsBox = _dbService.wordsBox;
    final userWordsRef = _firestore!.collection('users').doc(userId).collection('words');

    QuerySnapshot<Map<String, dynamic>> snapshot;
    if (lastSyncTime != null) {
      snapshot = await userWordsRef
          .where('updatedAt', isGreaterThanOrEqualTo: lastSyncTime.toIso8601String())
          .get();
    } else {
      snapshot = await userWordsRef.get();
    }

    int count = 0;

    for (final doc in snapshot.docs) {
      final data = doc.data();
      final remoteWord = WordModel.fromFirestore(data, doc.id);
      final localWord = wordsBox.get(remoteWord.id);

      if (remoteWord.isDeleted) {
        if (localWord != null) {
          await wordsBox.delete(remoteWord.id);
          count++;
        }
      } else {
        if (localWord == null || remoteWord.updatedAt.isAfter(localWord.updatedAt) || remoteWord.updatedAt == localWord.updatedAt) {
          await wordsBox.put(remoteWord.id, remoteWord);
          count++;
        }
      }
    }

    return count;
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Provides the singleton [SyncService] instance.
final syncServiceProvider = Provider<SyncService>((ref) {
  final dbService = ref.watch(databaseServiceProvider);
  final authService = ref.watch(authServiceProvider);
  return SyncService(
    dbService: dbService,
    authService: authService,
  );
});
