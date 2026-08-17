import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/word_model.dart';
import '../models/word_status.dart';
import '../repositories/word_repository.dart';

/// State representation for a Flashcard learning session.
class FlashcardState {
  final bool isLoading;
  final List<WordModel> words;
  final int currentIndex;
  final bool isFlipped;
  final bool isCompleted;
  final String? errorMessage;
  final int learnedCount;
  final int masteredCount;

  const FlashcardState({
    this.isLoading = false,
    this.words = const [],
    this.currentIndex = 0,
    this.isFlipped = false,
    this.isCompleted = false,
    this.errorMessage,
    this.learnedCount = 0,
    this.masteredCount = 0,
  });

  /// The currently active vocabulary word
  WordModel? get currentWord =>
      words.isNotEmpty && currentIndex < words.length ? words[currentIndex] : null;

  /// Progress ratio from 0.0 to 1.0
  double get progress =>
      words.isEmpty ? 0.0 : (currentIndex + (isCompleted ? 1 : 0)) / words.length;

  FlashcardState copyWith({
    bool? isLoading,
    List<WordModel>? words,
    int? currentIndex,
    bool? isFlipped,
    bool? isCompleted,
    String? errorMessage,
    int? learnedCount,
    int? masteredCount,
  }) {
    return FlashcardState(
      isLoading: isLoading ?? this.isLoading,
      words: words ?? this.words,
      currentIndex: currentIndex ?? this.currentIndex,
      isFlipped: isFlipped ?? this.isFlipped,
      isCompleted: isCompleted ?? this.isCompleted,
      errorMessage: errorMessage,
      learnedCount: learnedCount ?? this.learnedCount,
      masteredCount: masteredCount ?? this.masteredCount,
    );
  }
}

/// StateNotifier handling Flashcard interactions and status progression.
class FlashcardNotifier extends StateNotifier<FlashcardState> {
  final WordRepository _wordRepository;

  FlashcardNotifier({
    required WordRepository wordRepository,
  })  : _wordRepository = wordRepository,
        super(const FlashcardState());

  /// Initializes a flashcard session for the given [deckId].
  Future<void> startSession(String deckId) async {
    state = state.copyWith(isLoading: true, errorMessage: null, isCompleted: false);
    try {
      final words = await _wordRepository.getWordsByDeck(deckId);
      if (words.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          words: [],
          errorMessage: 'Bộ từ này chưa có từ vựng nào.',
        );
        return;
      }

      state = FlashcardState(
        isLoading: false,
        words: words,
        currentIndex: 0,
        isFlipped: false,
        isCompleted: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Lỗi khi tải thẻ từ vựng: $e',
      );
    }
  }

  /// Flips the current flashcard (Term <-> Definition).
  void flipCard() {
    if (state.words.isEmpty || state.isCompleted) return;
    state = state.copyWith(isFlipped: !state.isFlipped);
  }

  /// Advances to the next card without altering status.
  void nextCard() {
    if (state.words.isEmpty || state.isCompleted) return;
    if (state.currentIndex + 1 < state.words.length) {
      state = state.copyWith(
        currentIndex: state.currentIndex + 1,
        isFlipped: false,
      );
    } else {
      state = state.copyWith(isCompleted: true);
    }
  }

  /// Goes back to the previous card.
  void previousCard() {
    if (state.currentIndex > 0) {
      state = state.copyWith(
        currentIndex: state.currentIndex - 1,
        isFlipped: false,
        isCompleted: false,
      );
    }
  }

  /// Marks the current word as [WordStatus.learning] and moves to the next card.
  Future<void> markAsLearning() async {
    final word = state.currentWord;
    if (word == null) return;

    try {
      await _wordRepository.updateWordStatus(word.id, WordStatus.learning);
      final updatedWords = List<WordModel>.from(state.words);
      updatedWords[state.currentIndex] = word.copyWith(status: WordStatus.learning);

      final nextIndex = state.currentIndex + 1;
      final completed = nextIndex >= updatedWords.length;

      state = state.copyWith(
        words: updatedWords,
        currentIndex: completed ? state.currentIndex : nextIndex,
        isFlipped: false,
        isCompleted: completed,
        learnedCount: state.learnedCount + 1,
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Lỗi cập nhật trạng thái: $e');
    }
  }

  /// Marks the current word as [WordStatus.mastered] and moves to the next card.
  Future<void> markAsMastered() async {
    final word = state.currentWord;
    if (word == null) return;

    try {
      await _wordRepository.updateWordStatus(word.id, WordStatus.mastered);
      final updatedWords = List<WordModel>.from(state.words);
      updatedWords[state.currentIndex] = word.copyWith(status: WordStatus.mastered);

      final nextIndex = state.currentIndex + 1;
      final completed = nextIndex >= updatedWords.length;

      state = state.copyWith(
        words: updatedWords,
        currentIndex: completed ? state.currentIndex : nextIndex,
        isFlipped: false,
        isCompleted: completed,
        masteredCount: state.masteredCount + 1,
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Lỗi cập nhật trạng thái: $e');
    }
  }

  /// Restarts the session from the beginning.
  void restartSession() {
    if (state.words.isEmpty) return;
    state = state.copyWith(
      currentIndex: 0,
      isFlipped: false,
      isCompleted: false,
      learnedCount: 0,
      masteredCount: 0,
    );
  }
}
