import 'quiz_question.dart';
import 'word_model.dart';

/// Summarizes the performance and statistics of a completed Quiz session.
class QuizResult {
  final String deckId;
  final List<QuizQuestion> questions;
  final DateTime completedAt;

  QuizResult({
    required this.deckId,
    required this.questions,
    DateTime? completedAt,
  }) : completedAt = completedAt ?? DateTime.now();

  int get totalQuestions => questions.length;

  int get correctCount => questions.where((q) => q.isCorrect).length;

  int get incorrectCount => totalQuestions - correctCount;

  double get accuracyPercentage =>
      totalQuestions == 0 ? 0.0 : (correctCount / totalQuestions) * 100;

  List<WordModel> get correctWords =>
      questions.where((q) => q.isCorrect).map((q) => q.targetWord).toList();

  List<WordModel> get wrongWords =>
      questions.where((q) => !q.isCorrect).map((q) => q.targetWord).toList();

  @override
  String toString() =>
      'QuizResult(total: $totalQuestions, correct: $correctCount, accuracy: ${accuracyPercentage.toStringAsFixed(1)}%)';
}
