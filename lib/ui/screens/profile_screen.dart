import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../state/auth_controller.dart';
import '../../state/study_providers.dart';
import '../../state/sync_controller.dart';
import 'auth/login_screen.dart';

/// Screen displaying user account details, cloud synchronization metrics, and logout actions.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận đăng xuất'),
        content: const Text(
          'Dữ liệu từ vựng của bạn trên máy này vẫn sẽ được lưu trữ an toàn trong bộ nhớ ngoại tuyến.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(authControllerProvider.notifier).signOut();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã đăng xuất tài khoản.')),
                );
              }
            },
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final authState = ref.watch(authControllerProvider);
    final syncState = ref.watch(syncControllerProvider);
    final deckState = ref.watch(deckListProvider);

    final totalDecks = deckState.decks.length;
    int totalWords = 0;
    for (final c in deckState.wordCounts.values) {
      totalWords += c;
    }

    final formattedLastSync = syncState.lastSyncTime != null
        ? DateFormat('HH:mm:ss - dd/MM/yyyy').format(syncState.lastSyncTime!)
        : 'Chưa đồng bộ lần nào';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ Sơ & Đồng Bộ Cloud'),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. User Header Card
                Card(
                  elevation: 0,
                  color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.5)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          backgroundColor: theme.colorScheme.primary,
                          child: Text(
                            authState.displayName.isNotEmpty
                                ? authState.displayName[0].toUpperCase()
                                : 'V',
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      authState.displayName,
                                      style: theme.textTheme.titleLarge?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: authState.isAuthenticated && !authState.isGuest
                                          ? Colors.green.withValues(alpha: 0.15)
                                          : Colors.orange.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      authState.isAuthenticated && !authState.isGuest
                                          ? 'Đã đăng nhập'
                                          : 'Khách / Offline',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: authState.isAuthenticated && !authState.isGuest
                                            ? Colors.green
                                            : Colors.orange,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                authState.email.isNotEmpty
                                    ? authState.email
                                    : 'Chế độ lưu trữ nội bộ (Chưa liên kết tài khoản)',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // 2. Cloud Sync Management Card
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: theme.dividerColor.withValues(alpha: 0.5)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.cloud_sync_rounded,
                              color: theme.colorScheme.primary,
                              size: 24,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Đồng bộ Cloud Firestore',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const Spacer(),
                            if (syncState.isSyncing)
                              const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2.5),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 12),

                        // Stats Summary Row
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricTile(
                                context,
                                icon: Icons.folder_copy_outlined,
                                label: 'Tổng số bộ từ',
                                value: '$totalDecks bộ',
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildMetricTile(
                                context,
                                icon: Icons.spellcheck_rounded,
                                label: 'Tổng số từ vựng',
                                value: '$totalWords từ',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Last Sync Info
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.access_time_rounded,
                                size: 18,
                                color: theme.colorScheme.primary,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Lần đồng bộ gần nhất:',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    ),
                                    Text(
                                      formattedLastSync,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Sync Now Button
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: theme.colorScheme.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            onPressed: syncState.isSyncing
                                ? null
                                : () async {
                                    final result = await ref
                                        .read(syncControllerProvider.notifier)
                                        .syncNow();
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            result.isSuccess
                                                ? 'Đồng bộ thành công! (Đẩy: ${result.itemsPushed}, Nhận: ${result.itemsPulled})'
                                                : (result.errorMessage ?? 'Đồng bộ thất bại.'),
                                          ),
                                          backgroundColor:
                                              result.isSuccess ? Colors.green : Colors.red,
                                        ),
                                      );
                                    }
                                  },
                            icon: syncState.isSyncing
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.sync_rounded),
                            label: Text(
                              syncState.isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay (Sync Now)',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // 3. Guest Prompt or Log out Button
                if (!authState.isAuthenticated || authState.isGuest) ...[
                  Card(
                    color: theme.colorScheme.primary.withValues(alpha: 0.08),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: theme.colorScheme.primary.withValues(alpha: 0.3)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.shield_outlined, color: theme.colorScheme.primary),
                              const SizedBox(width: 10),
                              Text(
                                'Bảo vệ dữ liệu của bạn',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Bạn đang sử dụng tài khoản Khách. Hãy đăng nhập hoặc đăng ký để sao lưu từ vựng lên máy chủ Cloud và tránh mất dữ liệu khi đổi thiết bị.',
                            style: TextStyle(fontSize: 13),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const LoginScreen()),
                              );
                            },
                            icon: const Icon(Icons.login_rounded),
                            label: const Text('Đăng nhập / Đăng ký ngay'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () => _showLogoutDialog(context, ref),
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text(
                      'Đăng xuất tài khoản',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: theme.colorScheme.primary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.7),
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
