import 'word_model.dart';

/// Represents a single multiple-choice question in a VocaFlow Quiz session.
class QuizQuestion {
  final String id;
  final WordModel targetWord;
  final List<String> options;
  final int correctOptionIndex;
  final int? selectedOptionIndex;

  const QuizQuestion({
    required this.id,
    required this.targetWord,
    required this.options,
    required this.correctOptionIndex,
    this.selectedOptionIndex,
  });

  /// The correct definition text
  String get correctDefinition => options[correctOptionIndex];

  /// Whether the user has answered this question
  bool get isAnswered => selectedOptionIndex != null;

  /// Whether the user's selected choice is correct
  bool get isCorrect =>
      selectedOptionIndex != null && selectedOptionIndex == correctOptionIndex;

  /// Creates a copy of [QuizQuestion] with updated selected choice
  QuizQuestion copyWith({
    String? id,
    WordModel? targetWord,
    List<String>? options,
    int? correctOptionIndex,
    int? selectedOptionIndex,
  }) {
    return QuizQuestion(
      id: id ?? this.id,
      targetWord: targetWord ?? this.targetWord,
      options: options ?? this.options,
      correctOptionIndex: correctOptionIndex ?? this.correctOptionIndex,
      selectedOptionIndex: selectedOptionIndex ?? this.selectedOptionIndex,
    );
  }

  @override
  String toString() =>
      'QuizQuestion(term: ${targetWord.term}, correct: ${options[correctOptionIndex]}, selected: $selectedOptionIndex)';
}
