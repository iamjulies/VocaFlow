import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/deck_model.dart';
import '../../state/deck_state.dart';
import '../../state/study_providers.dart';
import '../widgets/deck_card.dart';
import '../widgets/edit_deck_dialog.dart';
import 'deck_detail_screen.dart';

/// Screen displaying the list or grid of all vocabulary Decks.
class DeckListScreen extends ConsumerWidget {
  const DeckListScreen({super.key});

  void _showCreateDeckDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => EditDeckDialog(
        onSave: (title, description, colorCode) {
          ref.read(deckListProvider.notifier).createDeck(
                title: title,
                description: description,
                colorCode: colorCode,
              );
        },
      ),
    );
  }

  void _showEditDeckDialog(BuildContext context, WidgetRef ref, DeckModel deck) {
    showDialog(
      context: context,
      builder: (ctx) => EditDeckDialog(
        initialDeck: deck,
        onSave: (title, description, colorCode) {
          ref.read(deckListProvider.notifier).updateDeck(
                deck.copyWith(
                  title: title,
                  description: description,
                  colorCode: colorCode,
                ),
              );
        },
      ),
    );
  }

  void _showDeleteDeckConfirm(BuildContext context, WidgetRef ref, DeckModel deck) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận xóa bộ từ'),
        content: Text(
          'Bạn có chắc chắn muốn xóa bộ từ "${deck.title}"? Tất cả từ vựng trong bộ từ này cũng sẽ bị xóa vĩnh viễn.',
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
            onPressed: () {
              ref.read(deckListProvider.notifier).deleteDeck(deck.id);
              Navigator.of(ctx).pop();
            },
            child: const Text('Xóa vĩnh viễn'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final deckState = ref.watch(deckListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.auto_stories_rounded,
                color: theme.colorScheme.primary,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            const Text('VocaFlow'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Tải lại danh sách',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.read(deckListProvider.notifier).loadDecks(),
          ),
        ],
      ),
      body: deckState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : deckState.decks.isEmpty
              ? _buildEmptyState(context, ref)
              : _buildResponsiveDeckGrid(context, ref, deckState),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDeckDialog(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tạo bộ từ'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.collections_bookmark_outlined,
                size: 64,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Chưa có bộ từ vựng nào',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'Hãy bắt đầu tạo bộ từ đầu tiên để lưu trữ và ôn tập từ vựng mỗi ngày.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showCreateDeckDialog(context, ref),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Tạo bộ từ ngay'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResponsiveDeckGrid(
    BuildContext context,
    WidgetRef ref,
    DeckListState state,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Compute crossAxisCount based on screen width
        int crossAxisCount = 1;
        if (constraints.maxWidth >= 1200) {
          crossAxisCount = 4;
        } else if (constraints.maxWidth >= 840) {
          crossAxisCount = 3;
        } else if (constraints.maxWidth >= 600) {
          crossAxisCount = 2;
        }

        return RefreshIndicator(
          onRefresh: () => ref.read(deckListProvider.notifier).loadDecks(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                mainAxisExtent: 150,
              ),
              itemCount: state.decks.length,
              itemBuilder: (context, index) {
                final deck = state.decks[index];
                final count = state.wordCounts[deck.id] ?? 0;

                return DeckCard(
                  deck: deck,
                  wordCount: count,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => DeckDetailScreen(deck: deck),
                      ),
                    );
                  },
                  onEdit: () => _showEditDeckDialog(context, ref, deck),
                  onDelete: () => _showDeleteDeckConfirm(context, ref, deck),
                );
              },
            ),
          ),
        );
      },
    );
  }
}
