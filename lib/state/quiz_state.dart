import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/services/quiz_engine.dart';
import '../models/quiz_question.dart';
import '../models/quiz_result.dart';
import '../models/word_status.dart';
import '../repositories/word_repository.dart';

/// State representation for an active Quiz session.
class QuizSessionState {
  final String? deckId;
  final bool isLoading;
  final List<QuizQuestion> questions;
  final int currentIndex;
  final int score;
  final bool isCompleted;
  final String? errorMessage;
  final QuizResult? result;

  const QuizSessionState({
    this.deckId,
    this.isLoading = false,
    this.questions = const [],
    this.currentIndex = 0,
    this.score = 0,
    this.isCompleted = false,
    this.errorMessage,
    this.result,
  });

  /// The current active question
  QuizQuestion? get currentQuestion =>
      questions.isNotEmpty && currentIndex < questions.length
          ? questions[currentIndex]
          : null;

  /// Progress ratio from 0.0 to 1.0
  double get progress =>
      questions.isEmpty ? 0.0 : (currentIndex + (isCompleted ? 1 : 0)) / questions.length;

  QuizSessionState copyWith({
    String? deckId,
    bool? isLoading,
    List<QuizQuestion>? questions,
    int? currentIndex,
    int? score,
    bool? isCompleted,
    String? errorMessage,
    QuizResult? result,
  }) {
    return QuizSessionState(
      deckId: deckId ?? this.deckId,
      isLoading: isLoading ?? this.isLoading,
      questions: questions ?? this.questions,
      currentIndex: currentIndex ?? this.currentIndex,
      score: score ?? this.score,
      isCompleted: isCompleted ?? this.isCompleted,
      errorMessage: errorMessage,
      result: result ?? this.result,
    );
  }
}

/// StateNotifier orchestrating quiz flow, answer validation, and result generation.
class QuizSessionNotifier extends StateNotifier<QuizSessionState> {
  final QuizEngine _quizEngine;
  final WordRepository _wordRepository;

  QuizSessionNotifier({
    required QuizEngine quizEngine,
    required WordRepository wordRepository,
  })  : _quizEngine = quizEngine,
        _wordRepository = wordRepository,
        super(const QuizSessionState());

  /// Starts a new quiz session for [deckId].
  Future<void> startQuiz(String deckId, {int count = 10}) async {
    state = state.copyWith(
      deckId: deckId,
      isLoading: true,
      errorMessage: null,
      isCompleted: false,
      result: null,
      score: 0,
      currentIndex: 0,
    );

    try {
      final questions = await _quizEngine.generateQuiz(deckId: deckId, count: count);
      if (questions.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          questions: [],
          errorMessage: 'Bộ từ này chưa có từ vựng để tạo bài kiểm tra.',
        );
        return;
      }

      state = QuizSessionState(
        deckId: deckId,
        isLoading: false,
        questions: questions,
        currentIndex: 0,
        score: 0,
        isCompleted: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Lỗi khi tạo bài trắc nghiệm: $e',
      );
    }
  }

  /// Selects an option for the current question and computes score.
  void selectOption(int optionIndex) {
    final currentQ = state.currentQuestion;
    if (currentQ == null || currentQ.isAnswered || state.isCompleted) return;

    final updatedQ = currentQ.copyWith(selectedOptionIndex: optionIndex);
    final updatedList = List<QuizQuestion>.from(state.questions);
    updatedList[state.currentIndex] = updatedQ;

    final isCorrect = updatedQ.isCorrect;
    final newScore = isCorrect ? state.score + 1 : state.score;

    // Proactively reinforce word status in repository
    if (isCorrect) {
      // If correct in quiz, update status towards mastered
      _wordRepository.updateWordStatus(currentQ.targetWord.id, WordStatus.mastered);
    } else {
      // If wrong, reinforce to learning status
      _wordRepository.updateWordStatus(currentQ.targetWord.id, WordStatus.learning);
    }

    state = state.copyWith(
      questions: updatedList,
      score: newScore,
    );
  }

  /// Proceeds to the next question or completes the quiz.
  void nextQuestion() {
    if (state.questions.isEmpty || state.isCompleted) return;

    if (state.currentIndex + 1 < state.questions.length) {
      state = state.copyWith(currentIndex: state.currentIndex + 1);
    } else {
      // Quiz finished - generate final QuizResult
      final result = QuizResult(
        deckId: state.deckId ?? '',
        questions: state.questions,
        completedAt: DateTime.now(),
      );

      state = state.copyWith(
        isCompleted: true,
        result: result,
      );
    }
  }

  /// Restarts the quiz with newly randomized options & questions.
  Future<void> restartQuiz({int count = 10}) async {
    if (state.deckId != null) {
      await startQuiz(state.deckId!, count: count);
    }
  }
}
