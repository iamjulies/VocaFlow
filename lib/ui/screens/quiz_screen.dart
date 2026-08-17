import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/themes/app_theme.dart';
import '../../models/deck_model.dart';
import '../../models/quiz_question.dart';
import '../../models/quiz_result.dart';
import '../../state/study_providers.dart';
import '../../services/tts_service.dart';

/// Screen for interactive 4-choice Multiple Choice Quiz testing.
class QuizScreen extends ConsumerWidget {
  final DeckModel deck;

  const QuizScreen({super.key, required this.deck});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizState = ref.watch(quizSessionProvider(deck.id));
    final quizNotifier = ref.read(quizSessionProvider(deck.id).notifier);
    final accentColor = Color(deck.colorCode);
    final ttsService = ref.watch(ttsServiceProvider);

    final currentWord = quizState.currentQuestion?.targetWord;

    return Scaffold(
      appBar: AppBar(
        title: Text('Trắc nghiệm: ${deck.title}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (currentWord != null)
            IconButton(
              icon: ttsService.state.isTermActive(currentWord.term) && ttsService.isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(
                      ttsService.state.isTermActive(currentWord.term) && ttsService.isPlaying
                          ? Icons.volume_up_rounded
                          : Icons.volume_up_outlined,
                    ),
              tooltip: 'Phát âm tự nhiên (Google TTS)',
              onPressed: () {
                ref.read(ttsServiceProvider).speak(currentWord.term);
              },
            ),
        ],
      ),
      body: quizState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : quizState.questions.isEmpty
              ? _buildEmptyState(context)
              : quizState.isCompleted && quizState.result != null
                  ? _buildResultView(context, quizState.result!, quizNotifier, accentColor)
                  : _buildQuestionView(context, quizState, quizNotifier, accentColor, ref),
    );
  }

  Widget _buildQuestionView(
    BuildContext context,
    dynamic quizState,
    dynamic quizNotifier,
    Color accentColor,
    WidgetRef ref,
  ) {
    final theme = Theme.of(context);
    final question = quizState.currentQuestion as QuizQuestion;
    final total = quizState.questions.length;
    final currentNumber = quizState.currentIndex + 1;
    final isAnswered = question.isAnswered;
    final ttsService = ref.watch(ttsServiceProvider);
    final isTtsActive = ttsService.state.isTermActive(question.targetWord.term);
    final isTtsLoading = isTtsActive && ttsService.isLoading;
    final isTtsPlaying = isTtsActive && ttsService.isPlaying;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Header: Question Counter & Score
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Câu $currentNumber / $total',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Điểm: ${quizState.score} / $total',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: accentColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: quizState.progress,
                minHeight: 6,
                backgroundColor: theme.dividerColor.withOpacity(0.1),
                valueColor: AlwaysStoppedAnimation<Color>(accentColor),
              ),
            ),

            const SizedBox(height: 20),

            // Prompt Card: Target Word Term
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: accentColor.withOpacity(0.25), width: 1.5),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                child: Column(
                  children: [
                    if (question.targetWord.partOfSpeech.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: accentColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          question.targetWord.partOfSpeech.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: accentColor,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          question.targetWord.term,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: isTtsLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Icon(
                                  isTtsPlaying ? Icons.volume_up_rounded : Icons.volume_up_outlined,
                                  color: isTtsPlaying ? accentColor : theme.iconTheme.color?.withOpacity(0.7),
                                ),
                          tooltip: 'Phát âm tự nhiên (Google TTS)',
                          onPressed: () {
                            ref.read(ttsServiceProvider).speak(question.targetWord.term);
                          },
                        ),
                      ],
                    ),
                    if (question.targetWord.phonetic.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        question.targetWord.phonetic,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: theme.textTheme.bodySmall?.color?.withOpacity(0.6),
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),
            Text(
              'Chọn nghĩa đúng:',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 10),

            // 4 Option Cards
            Expanded(
              child: ListView.builder(
                itemCount: question.options.length,
                itemBuilder: (context, index) {
                  final optionText = question.options[index];
                  final isSelected = question.selectedOptionIndex == index;
                  final isCorrectAnswer = index == question.correctOptionIndex;

                  Color cardBg = theme.cardTheme.color ?? Colors.white;
                  Color borderColor = theme.dividerColor.withOpacity(0.15);
                  Color textColor = theme.textTheme.bodyLarge?.color ?? Colors.black;
                  Widget? trailingIcon;

                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      // Correct option turns green
                      cardBg = AppTheme.successColor.withOpacity(0.12);
                      borderColor = AppTheme.successColor;
                      textColor = AppTheme.successColor;
                      trailingIcon = const Icon(
                        Icons.check_circle_rounded,
                        color: AppTheme.successColor,
                        size: 22,
                      );
                    } else if (isSelected && !isCorrectAnswer) {
                      // Selected wrong option turns red
                      cardBg = AppTheme.errorColor.withOpacity(0.12);
                      borderColor = AppTheme.errorColor;
                      textColor = AppTheme.errorColor;
                      trailingIcon = const Icon(
                        Icons.cancel_rounded,
                        color: AppTheme.errorColor,
                        size: 22,
                      );
                    } else {
                      textColor = textColor.withOpacity(0.5);
                    }
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: Material(
                      color: cardBg,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: BorderSide(color: borderColor, width: isAnswered && (isCorrectAnswer || isSelected) ? 2 : 1),
                      ),
                      child: InkWell(
                        onTap: isAnswered ? null : () => quizNotifier.selectOption(index),
                        borderRadius: BorderRadius.circular(14),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: borderColor.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  String.fromCharCode(65 + index), // A, B, C, D
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: textColor,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  optionText,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: textColor,
                                  ),
                                ),
                              ),
                              if (trailingIcon != null) trailingIcon,
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Bottom Button: "Câu tiếp theo"
            if (isAnswered)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: ElevatedButton(
                  onPressed: () => quizNotifier.nextQuestion(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accentColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    currentNumber < total ? 'Câu tiếp theo ➔' : 'Xem kết quả bài thi',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildResultView(
    BuildContext context,
    QuizResult result,
    dynamic quizNotifier,
    Color accentColor,
  ) {
    final theme = Theme.of(context);
    final accuracy = result.accuracyPercentage;
    final isGood = accuracy >= 80;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Score Banner Card
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(
                    isGood ? Icons.stars_rounded : Icons.psychology_rounded,
                    size: 64,
                    color: isGood ? AppTheme.successColor : AppTheme.warningColor,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isGood ? 'Kết Quả Xuất Sắc!' : 'Cần Ôn Luyện Thêm',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Đúng ${result.correctCount} / ${result.totalQuestions} câu (${accuracy.toStringAsFixed(0)}%)',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: accentColor,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Wrong words list if any
          if (result.wrongWords.isNotEmpty) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Từ vựng cần xem lại (${result.wrongWords.length}):',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.errorColor,
                ),
              ),
            ),
            const SizedBox(height: 10),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: result.wrongWords.length,
              itemBuilder: (context, index) {
                final word = result.wrongWords[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        const Icon(Icons.close_rounded, color: AppTheme.errorColor, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                word.term,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                              ),
                              Text(
                                word.definitionVi,
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),
          ],

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back_rounded),
                  label: const Text('Về bộ từ'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => quizNotifier.restartQuiz(),
                  icon: const Icon(Icons.replay_rounded),
                  label: const Text('Làm lại quiz'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accentColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
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

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.quiz_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Bộ từ này chưa có từ vựng để làm trắc nghiệm.'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Quay lại'),
            ),
          ],
        ),
      ),
    );
  }
}
