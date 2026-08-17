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

/// Hive implementation of [DeckRepository] with Soft-Delete Tombstone support for Cloud Sync.
class HiveDeckRepository implements DeckRepository {
  final DatabaseService _dbService;

  HiveDeckRepository({DatabaseService? dbService})
      : _dbService = dbService ?? DatabaseService.instance;

  Box<DeckModel> get _box => _dbService.decksBox;

  @override
  Future<List<DeckModel>> getAllDecks() async {
    try {
      final decks = _box.values.where((deck) => !deck.isDeleted).toList();
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
      final deck = _box.get(id);
      if (deck == null || deck.isDeleted) return null;
      return deck;
    } catch (e) {
      throw DatabaseException('Failed to retrieve deck by id ($id): $e', originalError: e);
    }
  }

  @override
  Future<void> createDeck(DeckModel deck) async {
    try {
      final newDeck = deck.copyWith(
        updatedAt: DateTime.now(),
        isDeleted: false,
      );
      await _box.put(newDeck.id, newDeck);
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
      final updated = deck.copyWith(
        updatedAt: DateTime.now(),
        isDeleted: false,
      );
      await _box.put(updated.id, updated);
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to update deck (${deck.id}): $e', originalError: e);
    }
  }

  @override
  Future<void> deleteDeck(String id) async {
    try {
      final existing = _box.get(id);
      if (existing == null) {
        throw NotFoundException('Deck not found with id: $id');
      }
      
      // Mark deck as soft-deleted with fresh timestamp for cloud sync replication
      final softDeletedDeck = existing.copyWith(
        isDeleted: true,
        updatedAt: DateTime.now(),
      );
      await _box.put(id, softDeletedDeck);
      
      // Cascade soft-delete all words belonging to this deck
      final wordsBox = _dbService.wordsBox;
      for (final entry in wordsBox.toMap().entries) {
        if (entry.value.deckId == id && !entry.value.isDeleted) {
          final softDeletedWord = entry.value.copyWith(
            isDeleted: true,
            updatedAt: DateTime.now(),
          );
          await wordsBox.put(entry.key, softDeletedWord);
        }
      }
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to delete deck ($id): $e', originalError: e);
    }
  }

  @override
  Future<int> getDeckCount() async {
    try {
      return _box.values.where((d) => !d.isDeleted).length;
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
