import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/auth_service.dart';
import '../services/sync_service.dart';

/// Lifecycle status states for data synchronization.
enum SyncStatus {
  idle,
  syncing,
  success,
  error,
  offline,
}

/// State representation for synchronization operations.
@immutable
class SyncState {
  final SyncStatus status;
  final DateTime? lastSyncTime;
  final String? errorMessage;
  final int itemsPushed;
  final int itemsPulled;

  const SyncState({
    this.status = SyncStatus.idle,
    this.lastSyncTime,
    this.errorMessage,
    this.itemsPushed = 0,
    this.itemsPulled = 0,
  });

  bool get isSyncing => status == SyncStatus.syncing;
  bool get isSuccess => status == SyncStatus.success;
  bool get isError => status == SyncStatus.error;
  bool get isOffline => status == SyncStatus.offline;

  SyncState copyWith({
    SyncStatus? status,
    DateTime? lastSyncTime,
    String? errorMessage,
    int? itemsPushed,
    int? itemsPulled,
    bool clearError = false,
  }) {
    return SyncState(
      status: status ?? this.status,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      itemsPushed: itemsPushed ?? this.itemsPushed,
      itemsPulled: itemsPulled ?? this.itemsPulled,
    );
  }

  @override
  String toString() =>
      'SyncState(status: $status, lastSync: $lastSyncTime, pushed: $itemsPushed, pulled: $itemsPulled, error: $errorMessage)';
}

/// StateNotifier orchestrating automatic and on-demand cloud synchronization.
class SyncController extends StateNotifier<SyncState> {
  final SyncService _syncService;
  final AuthService _authService;

  SyncController({
    required SyncService syncService,
    required AuthService authService,
  })  : _syncService = syncService,
        _authService = authService,
        super(SyncState(lastSyncTime: syncService.getLastSyncTime())) {
    // Auto-trigger sync when user signs in
    _authService.authStateChanges.listen((user) {
      if (user != null && !user.isAnonymous) {
        syncNow(targetUserId: user.uid);
      }
    });
  }

  /// Triggers a synchronization cycle immediately.
  Future<SyncResult> syncNow({String? targetUserId}) async {
    if (state.isSyncing) {
      debugPrint('[SyncController] Sync already in progress, skipping duplicate call.');
      return SyncResult.offline('Đang trong quá trình đồng bộ.');
    }

    state = state.copyWith(status: SyncStatus.syncing, clearError: true);

    try {
      final result = await _syncService.syncNow(targetUserId: targetUserId);

      if (result.isOffline) {
        state = state.copyWith(
          status: SyncStatus.offline,
          errorMessage: result.errorMessage,
        );
      } else if (result.isSuccess) {
        state = state.copyWith(
          status: SyncStatus.success,
          lastSyncTime: result.timestamp,
          itemsPushed: result.itemsPushed,
          itemsPulled: result.itemsPulled,
          clearError: true,
        );
      } else {
        state = state.copyWith(
          status: SyncStatus.error,
          errorMessage: result.errorMessage ?? 'Đồng bộ thất bại.',
        );
      }

      return result;
    } catch (e) {
      final errMsg = e.toString();
      state = state.copyWith(
        status: SyncStatus.error,
        errorMessage: errMsg,
      );
      return SyncResult.failure(errMsg);
    }
  }

  /// Clears any error messages.
  void clearError() {
    state = state.copyWith(clearError: true, status: SyncStatus.idle);
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global StateNotifierProvider for sync controller.
final syncControllerProvider = StateNotifierProvider<SyncController, SyncState>((ref) {
  final syncService = ref.watch(syncServiceProvider);
  final authService = ref.watch(authServiceProvider);
  return SyncController(
    syncService: syncService,
    authService: authService,
  );
});
