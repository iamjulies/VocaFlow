import 'package:hive/hive.dart';
import '../core/errors/app_exception.dart';
import '../core/services/database_service.dart';
import '../models/deck_model.dart';

/// Abstract contract for Deck data operations.
abstract class DeckRepository {
  Future<List<DeckModel>> getAllDecks();
  Future<DeckModel?> getDeckById(String id);
  Future<void> createDeck(DeckModel deck);
  Future<void> updateDeck(DeckModel deck);
  Future<void> deleteDeck(String id);
  Future<int> getDeckCount();
  Stream<List<DeckModel>> watchDecks();
}

/// Hive implementation of [DeckRepository].
class HiveDeckRepository implements DeckRepository {
  final DatabaseService _dbService;

  HiveDeckRepository({DatabaseService? dbService})
      : _dbService = dbService ?? DatabaseService.instance;

  Box<DeckModel> get _box => _dbService.decksBox;

  @override
  Future<List<DeckModel>> getAllDecks() async {
    try {
      final decks = _box.values.toList();
      // Sort by newest created first
      decks.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return decks;
    } catch (e) {
      throw DatabaseException('Failed to retrieve decks: $e', originalError: e);
    }
  }

  @override
  Future<DeckModel?> getDeckById(String id) async {
    try {
      return _box.get(id);
    } catch (e) {
      throw DatabaseException('Failed to retrieve deck by id ($id): $e', originalError: e);
    }
  }

  @override
  Future<void> createDeck(DeckModel deck) async {
    try {
      await _box.put(deck.id, deck);
    } catch (e) {
      throw DatabaseException('Failed to create deck (${deck.title}): $e', originalError: e);
    }
  }

  @override
  Future<void> updateDeck(DeckModel deck) async {
    try {
      if (!_box.containsKey(deck.id)) {
        throw NotFoundException('Deck not found with id: ${deck.id}');
      }
      final updated = deck.copyWith(updatedAt: DateTime.now());
      await _box.put(updated.id, updated);
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to update deck (${deck.id}): $e', originalError: e);
    }
  }

  @override
  Future<void> deleteDeck(String id) async {
    try {
      if (!_box.containsKey(id)) {
        throw NotFoundException('Deck not found with id: $id');
      }
      await _box.delete(id);
      
      // Cascade delete: remove all words associated with this deck
      final wordsBox = _dbService.wordsBox;
      final wordKeysToDelete = <dynamic>[];
      for (final entry in wordsBox.toMap().entries) {
        if (entry.value.deckId == id) {
          wordKeysToDelete.add(entry.key);
        }
      }
      if (wordKeysToDelete.isNotEmpty) {
        await wordsBox.deleteAll(wordKeysToDelete);
      }
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to delete deck ($id): $e', originalError: e);
    }
  }

  @override
  Future<int> getDeckCount() async {
    try {
      return _box.length;
    } catch (e) {
      throw DatabaseException('Failed to get deck count: $e', originalError: e);
    }
  }

  @override
  Stream<List<DeckModel>> watchDecks() async* {
    yield await getAllDecks();
    yield* _box.watch().asyncMap((_) => getAllDecks());
  }
}
