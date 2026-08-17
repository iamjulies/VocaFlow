import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/themes/app_theme.dart';
import '../../models/word_model.dart';
import '../../models/word_status.dart';
import '../../services/tts_service.dart';

/// List item widget presenting a vocabulary word with definition, phonetic, CEFR, metadata badges, and natural audio TTS.
class WordListItem extends ConsumerWidget {
  final WordModel word;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onTap;

  const WordListItem({
    super.key,
    required this.word,
    required this.onEdit,
    required this.onDelete,
    this.onTap,
  });

  Color _getStatusColor(WordStatus status) {
    switch (status) {
      case WordStatus.newWord:
        return const Color(0xFF64748B); // Slate Blue
      case WordStatus.learning:
        return AppTheme.warningColor; // Amber
      case WordStatus.mastered:
        return AppTheme.successColor; // Emerald
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(word.status);
    final ttsService = ref.watch(ttsServiceProvider);
    final isTtsActive = ttsService.state.isTermActive(word.term);
    final isTtsLoading = isTtsActive && ttsService.isLoading;
    final isTtsPlaying = isTtsActive && ttsService.isPlaying;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap ?? onEdit,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status Indicator Dot
              Container(
                width: 10,
                height: 10,
                margin: const EdgeInsets.only(top: 6, right: 12),
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),

              // Word Term, Phonetic, POS, TTS & Definition
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        Text(
                          word.term,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),

                        // Natural TTS Speaker Button
                        InkWell(
                          onTap: () {
                            ref.read(ttsServiceProvider).speak(word.term);
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: Padding(
                            padding: const EdgeInsets.all(4.0),
                            child: isTtsLoading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Icon(
                                    isTtsPlaying
                                        ? Icons.volume_up_rounded
                                        : Icons.volume_up_outlined,
                                    size: 18,
                                    color: isTtsPlaying
                                        ? theme.colorScheme.primary
                                        : theme.iconTheme.color?.withOpacity(0.7),
                                  ),
                          ),
                        ),

                        if (word.cefrLevel != null && word.cefrLevel!.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF8B5CF6).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              word.cefrLevel!,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: const Color(0xFF7C3AED),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                        if (word.partOfSpeech.isNotEmpty) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              word.partOfSpeech.toLowerCase(),
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.w700,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ),
                        ],
                        if (word.phonetic.isNotEmpty) ...[
                          Text(
                            word.phonetic,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.textTheme.bodySmall?.color?.withOpacity(0.6),
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      word.definitionVi,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.textTheme.bodyMedium?.color?.withOpacity(0.9),
                      ),
                    ),
                    if (word.exampleSentence != null &&
                        word.exampleSentence!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        '“${word.exampleSentence}”',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.textTheme.bodySmall?.color?.withOpacity(0.6),
                          fontStyle: FontStyle.italic,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],

                    // Synonyms / Collocations tags preview
                    if (word.synonyms.isNotEmpty || word.collocations.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          if (word.synonyms.isNotEmpty)
                            Text(
                              '≈ ${word.synonyms.take(3).join(', ')}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: const Color(0xFF0284C7),
                                fontSize: 11,
                              ),
                            ),
                          if (word.collocations.isNotEmpty)
                            Text(
                              '• ${word.collocations.take(2).join(', ')}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: const Color(0xFF059669),
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Status Badge & Action Menu
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      word.status.labelVi,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: statusColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_horiz_rounded,
                      size: 18,
                      color: theme.iconTheme.color?.withOpacity(0.6),
                    ),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onSelected: (value) {
                      if (value == 'edit') onEdit();
                      if (value == 'delete') onDelete();
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                          value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit_outlined, size: 18),
                            SizedBox(width: 8),
                            Text('Chỉnh sửa'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Xóa', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
