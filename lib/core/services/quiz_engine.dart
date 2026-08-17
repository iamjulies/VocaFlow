import 'dart:math';
import 'package:uuid/uuid.dart';

import '../../models/quiz_question.dart';
import '../../models/word_model.dart';
import '../../models/word_status.dart';
import '../../repositories/word_repository.dart';

/// Service generating and orchestrating multiple-choice quizzes for VocaFlow.
///
/// Implements 3+1 distractor selection algorithm with fail-safe fallbacks.
class QuizEngine {
  final WordRepository _wordRepository;
  final Uuid _uuid;
  final Random _random;

  QuizEngine({
    WordRepository? wordRepository,
    Uuid? uuid,
    Random? random,
  })  : _wordRepository = wordRepository ?? HiveWordRepository(),
        _uuid = uuid ?? const Uuid(),
        _random = random ?? Random();

  /// Curated fallback definitions used ONLY when the entire app has < 4 total words.
  static const List<String> _safetyDistractorPool = [
    'Có mặt ở khắp mọi nơi cùng một lúc',
    'Khả năng phục hồi nhanh chóng sau khó khăn',
    'Sự tạm hoãn hoặc khoảng thời gian nghỉ ngơi',
    'Lòng trung thành và tận tụy kiên định',
    'Sự sâu sắc, uyên bác và hiểu biết rộng',
    'Tính kiên nhẫn, bền bỉ vượt qua trở ngại',
    'Trực giác nhạy bén và khả năng thấu cảm',
    'Sự rõ ràng, minh bạch và khúc chiết',
  ];

  /// Generates a list of 4-option multiple-choice questions for [deckId].
  ///
  /// [count]: Desired number of questions (defaults to 10).
  Future<List<QuizQuestion>> generateQuiz({
    required String deckId,
    int count = 10,
  }) async {
    final deckWords = await _wordRepository.getWordsByDeck(deckId);
    if (deckWords.isEmpty) {
      return [];
    }

    // Prioritize words: newWord -> learning -> mastered
    final sortedTargets = _prioritizeWords(deckWords);
    final targetWords = sortedTargets.take(count).toList();

    // Pool of distractors from current deck
    final deckDefinitions = deckWords
        .map((w) => w.definitionVi.trim())
        .where((d) => d.isNotEmpty)
        .toSet();

    // Pool of all words across the entire app
    final allWords = await _wordRepository.getAllWords();
    final allAppDefinitions = allWords
        .map((w) => w.definitionVi.trim())
        .where((d) => d.isNotEmpty)
        .toSet();

    final questions = <QuizQuestion>[];

    for (final targetWord in targetWords) {
      final correctDef = targetWord.definitionVi.trim();

      // Step 1: Collect candidate distractors from the current deck
      final localDistractors = deckDefinitions
          .where((def) => def != correctDef)
          .toList()..shuffle(_random);

      final selectedDistractors = <String>[];

      for (final distractor in localDistractors) {
        if (selectedDistractors.length < 3) {
          selectedDistractors.add(distractor);
        }
      }

      // Step 2 (Edge Case Fallback 1): If < 3 distractors, fetch from global app pool
      if (selectedDistractors.length < 3) {
        final globalDistractors = allAppDefinitions
            .where((def) => def != correctDef && !selectedDistractors.contains(def))
            .toList()..shuffle(_random);

        for (final distractor in globalDistractors) {
          if (selectedDistractors.length < 3) {
            selectedDistractors.add(distractor);
          }
        }
      }

      // Step 3 (Edge Case Fallback 2): If still < 3 distractors (total words in app < 4)
      if (selectedDistractors.length < 3) {
        final safetyPool = _safetyDistractorPool
            .where((def) => def != correctDef && !selectedDistractors.contains(def))
            .toList()..shuffle(_random);

        for (final distractor in safetyPool) {
          if (selectedDistractors.length < 3) {
            selectedDistractors.add(distractor);
          }
        }
      }

      // Combine 1 correct answer + 3 distractors
      final options = [correctDef, ...selectedDistractors.take(3)];
      options.shuffle(_random);

      final correctIndex = options.indexOf(correctDef);

      questions.add(
        QuizQuestion(
          id: _uuid.v4(),
          targetWord: targetWord,
          options: options,
          correctOptionIndex: correctIndex,
        ),
      );
    }

    return questions;
  }

  /// Sorts words putting `newWord` first, then `learning`, then `mastered`, with internal shuffling.
  List<WordModel> _prioritizeWords(List<WordModel> words) {
    final newWords = words.where((w) => w.status == WordStatus.newWord).toList()..shuffle(_random);
    final learningWords = words.where((w) => w.status == WordStatus.learning).toList()..shuffle(_random);
    final masteredWords = words.where((w) => w.status == WordStatus.mastered).toList()..shuffle(_random);

    return [...newWords, ...learningWords, ...masteredWords];
  }
}
