import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/constants/app_constants.dart';
import '../models/deck_model.dart';
import '../repositories/deck_repository.dart';
import '../repositories/word_repository.dart';

/// State representation for the Deck List view.
class DeckListState {
  final bool isLoading;
  final List<DeckModel> decks;
  final Map<String, int> wordCounts;
  final String? errorMessage;

  const DeckListState({
    this.isLoading = false,
    this.decks = const [],
    this.wordCounts = const {},
    this.errorMessage,
  });

  DeckListState copyWith({
    bool? isLoading,
    List<DeckModel>? decks,
    Map<String, int>? wordCounts,
    String? errorMessage,
  }) {
    return DeckListState(
      isLoading: isLoading ?? this.isLoading,
      decks: decks ?? this.decks,
      wordCounts: wordCounts ?? this.wordCounts,
      errorMessage: errorMessage,
    );
  }
}

/// StateNotifier managing Deck CRUD operations and word counts.
class DeckListNotifier extends StateNotifier<DeckListState> {
  final DeckRepository _deckRepository;
  final WordRepository _wordRepository;
  final Uuid _uuid;

  DeckListNotifier({
    required DeckRepository deckRepository,
    required WordRepository wordRepository,
    Uuid? uuid,
  })  : _deckRepository = deckRepository,
        _wordRepository = wordRepository,
        _uuid = uuid ?? const Uuid(),
        super(const DeckListState()) {
    loadDecks();
  }

  /// Loads all decks and fetches their respective word counts.
  Future<void> loadDecks() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final decks = await _deckRepository.getAllDecks();
      final counts = <String, int>{};

      for (final deck in decks) {
        counts[deck.id] = await _wordRepository.getWordCount(deckId: deck.id);
      }

      state = state.copyWith(
        isLoading: false,
        decks: decks,
        wordCounts: counts,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Không thể tải danh sách bộ từ: $e',
      );
    }
  }

  /// Creates a new Deck and refreshes state.
  Future<DeckModel?> createDeck({
    required String title,
    String description = '',
    int? colorCode,
  }) async {
    try {
      final newDeck = DeckModel(
        id: _uuid.v4(),
        title: title.trim(),
        description: description.trim(),
        colorCode: colorCode ??
            AppConstants.defaultDeckColors[
                state.decks.length % AppConstants.defaultDeckColors.length],
        createdAt: DateTime.now(),
      );

      await _deckRepository.createDeck(newDeck);
      await loadDecks();
      return newDeck;
    } catch (e) {
      state = state.copyWith(errorMessage: 'Lỗi khi tạo bộ từ: $e');
      return null;
    }
  }

  /// Updates an existing Deck.
  Future<void> updateDeck(DeckModel deck) async {
    try {
      await _deckRepository.updateDeck(deck);
      await loadDecks();
    } catch (e) {
      state = state.copyWith(errorMessage: 'Lỗi khi cập nhật bộ từ: $e');
    }
  }

  /// Deletes a Deck and cascades deletion of its words.
  Future<void> deleteDeck(String deckId) async {
    try {
      await _deckRepository.deleteDeck(deckId);
      await loadDecks();
    } catch (e) {
      state = state.copyWith(errorMessage: 'Lỗi khi xóa bộ từ: $e');
    }
  }
}
