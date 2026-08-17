import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/services/database_service.dart';
import '../core/services/quiz_engine.dart';
import '../models/deck_model.dart';
import '../models/word_model.dart';
import '../models/word_status.dart';
import '../repositories/deck_repository.dart';
import '../repositories/word_repository.dart';
import 'deck_state.dart';
import 'flashcard_state.dart';
import 'quiz_state.dart';

// ==========================================
// CORE INFRASTRUCTURE PROVIDERS
// ==========================================

/// Provides the singleton [DatabaseService] instance.
final databaseServiceProvider = Provider<DatabaseService>((ref) {
  return DatabaseService.instance;
});

/// Provides the [DeckRepository] implementation.
final deckRepositoryProvider = Provider<DeckRepository>((ref) {
  final dbService = ref.watch(databaseServiceProvider);
  return HiveDeckRepository(dbService: dbService);
});

/// Provides the [WordRepository] implementation.
final wordRepositoryProvider = Provider<WordRepository>((ref) {
  final dbService = ref.watch(databaseServiceProvider);
  return HiveWordRepository(dbService: dbService);
});

/// Provides the [QuizEngine] service.
final quizEngineProvider = Provider<QuizEngine>((ref) {
  final wordRepo = ref.watch(wordRepositoryProvider);
  return QuizEngine(wordRepository: wordRepo);
});

// ==========================================
// DECK STATE PROVIDERS
// ==========================================

/// Manages the full list of decks and their word counts.
final deckListProvider = StateNotifierProvider<DeckListNotifier, DeckListState>((ref) {
  final deckRepo = ref.watch(deckRepositoryProvider);
  final wordRepo = ref.watch(wordRepositoryProvider);
  return DeckListNotifier(
    deckRepository: deckRepo,
    wordRepository: wordRepo,
  );
});

/// Stream of decks for real-time reactivity.
final decksStreamProvider = StreamProvider<List<DeckModel>>((ref) {
  final deckRepo = ref.watch(deckRepositoryProvider);
  return deckRepo.watchDecks();
});

// ==========================================
// WORD STATE PROVIDERS
// ==========================================

/// Fetches words for a specific deck.
final wordsByDeckProvider = FutureProvider.family<List<WordModel>, String>((ref, deckId) async {
  final wordRepo = ref.watch(wordRepositoryProvider);
  return wordRepo.getWordsByDeck(deckId);
});

/// Real-time stream of words for a specific deck.
final wordsStreamByDeckProvider = StreamProvider.family<List<WordModel>, String>((ref, deckId) {
  final wordRepo = ref.watch(wordRepositoryProvider);
  return wordRepo.watchWordsByDeck(deckId);
});

/// Aggregated counts by status (`newWord`, `learning`, `mastered`) for a specific deck.
final deckStatusCountsProvider = FutureProvider.family<Map<WordStatus, int>, String>((ref, deckId) async {
  final wordRepo = ref.watch(wordRepositoryProvider);
  return wordRepo.getStatusCounts(deckId);
});

// ==========================================
// STUDY SESSION PROVIDERS
// ==========================================

/// Auto-disposing StateNotifierProvider managing an active Flashcard learning session for [deckId].
final flashcardSessionProvider =
    StateNotifierProvider.autoDispose.family<FlashcardNotifier, FlashcardState, String>(
  (ref, deckId) {
    final wordRepo = ref.watch(wordRepositoryProvider);
    final notifier = FlashcardNotifier(wordRepository: wordRepo);
    notifier.startSession(deckId);
    return notifier;
  },
);

/// Auto-disposing StateNotifierProvider managing an active Quiz session for [deckId].
final quizSessionProvider =
    StateNotifierProvider.autoDispose.family<QuizSessionNotifier, QuizSessionState, String>(
  (ref, deckId) {
    final quizEngine = ref.watch(quizEngineProvider);
    final wordRepo = ref.watch(wordRepositoryProvider);
    final notifier = QuizSessionNotifier(
      quizEngine: quizEngine,
      wordRepository: wordRepo,
    );
    notifier.startQuiz(deckId);
    return notifier;
  },
);
