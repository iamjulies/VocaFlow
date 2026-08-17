import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../models/deck_model.dart';
import '../../models/word_model.dart';
import '../../models/word_status.dart';
import '../../services/excel_service.dart';
import '../../state/study_providers.dart';
import '../widgets/word_list_item.dart';
import 'flashcard_screen.dart';
import 'quiz_screen.dart';
import 'word_form_dialog.dart';

/// Screen displaying the vocabulary words of a specific Deck with filtering,
/// Excel Import/Export operations, and study launcher.
class DeckDetailScreen extends ConsumerStatefulWidget {
  final DeckModel deck;

  const DeckDetailScreen({super.key, required this.deck});

  @override
  ConsumerState<DeckDetailScreen> createState() => _DeckDetailScreenState();
}

class _DeckDetailScreenState extends ConsumerState<DeckDetailScreen> {
  String _searchQuery = '';
  WordStatus? _selectedStatusFilter;
  final TextEditingController _searchController = TextEditingController();
  final ExcelService _excelService = ExcelService();
  bool _isProcessingExcel = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddWordDialog() {
    showDialog(
      context: context,
      builder: (ctx) => WordFormDialog(
        deckId: widget.deck.id,
        onSave: (term, pos, phonetic, def, example, note, status, syn, ant, coll, cefr) async {
          final newWord = WordModel(
            id: const Uuid().v4(),
            deckId: widget.deck.id,
            term: term,
            partOfSpeech: pos,
            phonetic: phonetic,
            definitionVi: def,
            exampleSentence: example,
            note: note,
            status: status,
            createdAt: DateTime.now(),
            synonyms: syn,
            antonyms: ant,
            collocations: coll,
            cefrLevel: cefr,
          );
          await ref.read(wordRepositoryProvider).createWord(newWord);
          _refreshDeckData();
        },
      ),
    );
  }

  void _showEditWordDialog(WordModel word) {
    showDialog(
      context: context,
      builder: (ctx) => WordFormDialog(
        initialWord: word,
        deckId: widget.deck.id,
        onSave: (term, pos, phonetic, def, example, note, status, syn, ant, coll, cefr) async {
          final updated = word.copyWith(
            term: term,
            partOfSpeech: pos,
            phonetic: phonetic,
            definitionVi: def,
            exampleSentence: example,
            note: note,
            status: status,
            synonyms: syn,
            antonyms: ant,
            collocations: coll,
            cefrLevel: cefr,
            updatedAt: DateTime.now(),
          );
          await ref.read(wordRepositoryProvider).updateWord(updated);
          _refreshDeckData();
        },
      ),
    );
  }

  void _showDeleteWordConfirm(WordModel word) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận xóa từ vựng'),
        content: Text('Bạn có chắc chắn muốn xóa từ "${word.term}" không?'),
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
              await ref.read(wordRepositoryProvider).deleteWord(word.id);
              _refreshDeckData();
              if (mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
  }

  void _refreshDeckData() {
    ref.invalidate(wordsByDeckProvider(widget.deck.id));
    ref.invalidate(deckStatusCountsProvider(widget.deck.id));
    ref.read(deckListProvider.notifier).loadDecks();
  }

  Future<void> _exportToExcel() async {
    setState(() => _isProcessingExcel = true);
    try {
      final words = await ref.read(wordRepositoryProvider).getWordsByDeck(widget.deck.id);
      if (words.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Bộ từ này chưa có từ vựng nào để xuất Excel!')),
          );
        }
        return;
      }

      final exportedPath = await _excelService.exportDeckToExcel(widget.deck, words);
      if (exportedPath != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã xuất thành công ${words.length} từ vựng ra file Excel!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi khi xuất file Excel: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessingExcel = false);
    }
  }

  Future<void> _importFromExcel() async {
    setState(() => _isProcessingExcel = true);
    try {
      final result = await _excelService.importWordsFromExcel(widget.deck.id);

      if (result.importedWords.isNotEmpty) {
        await ref.read(wordRepositoryProvider).createWordsBatch(result.importedWords);
        _refreshDeckData();

        if (mounted) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: Colors.green),
                  SizedBox(width: 8),
                  Text('Nhập Excel Thành Công'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('✅ Đã nhập thành công: ${result.importedWords.length} từ vựng.'),
                  if (result.skippedCount > 0)
                    Text('⚠️ Bỏ qua ${result.skippedCount} dòng trống/không hợp lệ.'),
                  const SizedBox(height: 12),
                  if (result.recognizedColumns.isNotEmpty) ...[
                    const Text('📌 Các cột đã nhận diện:', style: TextStyle(fontWeight: FontWeight.w600)),
                    Text(
                      result.recognizedColumns.join(', '),
                      style: const TextStyle(fontSize: 12, color: Colors.green),
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (result.unrecognizedColumns.isNotEmpty) ...[
                    const Text('⚠️ Cột không nhận diện được (đã bỏ qua):', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.orange)),
                    Text(
                      result.unrecognizedColumns.join(', '),
                      style: const TextStyle(fontSize: 12, color: Colors.orange),
                    ),
                  ],
                ],
              ),
              actions: [
                ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Đóng'),
                ),
              ],
            ),
          );
        }
      } else if (result.errors.isNotEmpty && mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.error_outline_rounded, color: Colors.red),
                SizedBox(width: 8),
                Text('Lỗi Nhập Excel'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ...result.errors.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text('• $e'),
                    )),
                if (result.unrecognizedColumns.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Text('Các cột tìm thấy trong file nhưng không khớp tên chuẩn:', style: TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    result.unrecognizedColumns.join(', '),
                    style: const TextStyle(fontSize: 12, color: Colors.orange),
                  ),
                ],
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Đã hiểu'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi khi đọc file Excel: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessingExcel = false);
    }
  }

  Future<void> _downloadTemplate() async {
    setState(() => _isProcessingExcel = true);
    try {
      final templatePath = await _excelService.exportSampleTemplate();
      if (templatePath != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã tải thành công file Excel mẫu (.xlsx)! Hãy mở và điền theo từng cột.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải file mẫu: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessingExcel = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final wordsAsync = ref.watch(wordsStreamByDeckProvider(widget.deck.id));
    final statusCountsAsync = ref.watch(deckStatusCountsProvider(widget.deck.id));
    final accentColor = Color(widget.deck.colorCode);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.deck.title),
        actions: [
          IconButton(
            tooltip: 'Thêm từ mới',
            icon: const Icon(Icons.add_rounded),
            onPressed: _showAddWordDialog,
          ),
          PopupMenuButton<String>(
            tooltip: 'Tùy chọn Excel',
            icon: const Icon(Icons.more_vert_rounded),
            onSelected: (val) {
              if (val == 'import') _importFromExcel();
              if (val == 'export') _exportToExcel();
              if (val == 'template') _downloadTemplate();
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'import',
                child: Row(
                  children: [
                    Icon(Icons.file_upload_outlined, size: 20, color: Color(0xFF4F46E5)),
                    SizedBox(width: 10),
                    Text('Nhập từ file Excel (.xlsx)'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.file_download_outlined, size: 20, color: Color(0xFF10B981)),
                    SizedBox(width: 10),
                    Text('Xuất ra file Excel (.xlsx)'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'template',
                child: Row(
                  children: [
                    Icon(Icons.description_outlined, size: 20, color: Color(0xFFF59E0B)),
                    SizedBox(width: 10),
                    Text('Tải File Excel Mẫu (.xlsx)'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Header Summary Card & Study Launchers
              _buildHeaderCard(context, accentColor, statusCountsAsync),

              // Search Bar & Filter Chips
              _buildFilterSection(theme),

              // Word List
              Expanded(
                child: wordsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(child: Text('Lỗi: $err')),
                  data: (allWords) {
                    // Apply search filter
                    var filtered = allWords.where((w) {
                      final matchesQuery = _searchQuery.isEmpty ||
                          w.term.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                          w.definitionVi.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                          w.synonyms.any((s) => s.toLowerCase().contains(_searchQuery.toLowerCase()));
                      final matchesStatus = _selectedStatusFilter == null ||
                          w.status == _selectedStatusFilter;
                      return matchesQuery && matchesStatus;
                    }).toList();

                    if (filtered.isEmpty) {
                      return _buildEmptyWords(context, allWords.isEmpty);
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final word = filtered[index];
                        return WordListItem(
                          word: word,
                          onEdit: () => _showEditWordDialog(word),
                          onDelete: () => _showDeleteWordConfirm(word),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),

          if (_isProcessingExcel)
            Container(
              color: Colors.black38,
              child: const Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Đang xử lý file Excel...', style: TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddWordDialog,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Thêm từ vựng'),
      ),
    );
  }

  Widget _buildHeaderCard(
    BuildContext context,
    Color accentColor,
    AsyncValue<Map<WordStatus, int>> statusCountsAsync,
  ) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.deck.description.isNotEmpty) ...[
            Text(
              widget.deck.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Status Counters Row
          statusCountsAsync.when(
            data: (counts) {
              final newCount = counts[WordStatus.newWord] ?? 0;
              final learningCount = counts[WordStatus.learning] ?? 0;
              final masteredCount = counts[WordStatus.mastered] ?? 0;

              return Row(
                children: [
                  _buildStatBadge(context, 'Mới', newCount, const Color(0xFF64748B)),
                  const SizedBox(width: 8),
                  _buildStatBadge(context, 'Đang học', learningCount, const Color(0xFFF59E0B)),
                  const SizedBox(width: 8),
                  _buildStatBadge(context, 'Đã thuộc', masteredCount, const Color(0xFF10B981)),
                ],
              );
            },
            loading: () => const SizedBox(height: 24),
            error: (_, __) => const SizedBox.shrink(),
          ),

          const SizedBox(height: 16),

          // Study Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => FlashcardScreen(deck: widget.deck),
                      ),
                    );
                  },
                  icon: const Icon(Icons.flip_to_front_rounded, size: 18),
                  label: const Text('Flashcard'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accentColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => QuizScreen(deck: widget.deck),
                      ),
                    );
                  },
                  icon: const Icon(Icons.quiz_outlined, size: 18),
                  label: const Text('Luyện Quiz'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: accentColor,
                    side: BorderSide(color: accentColor, width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatBadge(BuildContext context, String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            '$label: $count',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // Search Field
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Tìm kiếm từ vựng, nghĩa, từ đồng nghĩa...',
              prefixIcon: const Icon(Icons.search_rounded, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      onPressed: () {
                        setState(() {
                          _searchController.clear();
                          _searchQuery = '';
                        });
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onChanged: (val) => setState(() => _searchQuery = val),
          ),
          const SizedBox(height: 10),

          // Status Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Tất cả'),
                  selected: _selectedStatusFilter == null,
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedStatusFilter = null);
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Mới'),
                  selected: _selectedStatusFilter == WordStatus.newWord,
                  onSelected: (selected) {
                    setState(() => _selectedStatusFilter = selected ? WordStatus.newWord : null);
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Đang học'),
                  selected: _selectedStatusFilter == WordStatus.learning,
                  onSelected: (selected) {
                    setState(() => _selectedStatusFilter = selected ? WordStatus.learning : null);
                  },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: const Text('Đã thuộc'),
                  selected: _selectedStatusFilter == WordStatus.mastered,
                  onSelected: (selected) {
                    setState(() => _selectedStatusFilter = selected ? WordStatus.mastered : null);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildEmptyWords(BuildContext context, bool isDeckEmpty) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isDeckEmpty ? Icons.library_books_outlined : Icons.search_off_rounded,
              size: 56,
              color: theme.disabledColor,
            ),
            const SizedBox(height: 16),
            Text(
              isDeckEmpty ? 'Bộ từ chưa có từ vựng nào' : 'Không tìm thấy từ vựng phù hợp',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              isDeckEmpty
                  ? 'Bấm nút "Thêm từ vựng" hoặc nhập danh sách từ file Excel (.xlsx).'
                  : 'Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
            if (isDeckEmpty) ...[
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton.icon(
                    onPressed: _importFromExcel,
                    icon: const Icon(Icons.file_upload_outlined),
                    label: const Text('Nhập từ Excel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _showAddWordDialog,
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Thêm thủ công'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
