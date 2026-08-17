import 'package:hive/hive.dart';
import '../core/errors/app_exception.dart';
import '../core/services/database_service.dart';
import '../models/word_model.dart';
import '../models/word_status.dart';

/// Abstract contract for Word data operations.
abstract class WordRepository {
  Future<List<WordModel>> getAllWords();
  Future<WordModel?> getWordById(String id);
  Future<List<WordModel>> getWordsByDeck(String deckId);
  Future<List<WordModel>> getWordsByStatus(String deckId, WordStatus status);
  Future<List<WordModel>> searchWords(String query, {String? deckId});
  Future<void> createWord(WordModel word);
  Future<void> createWordsBatch(List<WordModel> words);
  Future<void> updateWord(WordModel word);
  Future<void> updateWordStatus(String wordId, WordStatus newStatus);
  Future<void> deleteWord(String id);
  Future<void> deleteWordsByDeck(String deckId);
  Future<int> getWordCount({String? deckId});
  Future<Map<WordStatus, int>> getStatusCounts(String deckId);
  Stream<List<WordModel>> watchWordsByDeck(String deckId);
}

/// Hive implementation of [WordRepository].
class HiveWordRepository implements WordRepository {
  final DatabaseService _dbService;

  HiveWordRepository({DatabaseService? dbService})
      : _dbService = dbService ?? DatabaseService.instance;

  Box<WordModel> get _box => _dbService.wordsBox;

  @override
  Future<List<WordModel>> getAllWords() async {
    try {
      return _box.values.toList();
    } catch (e) {
      throw DatabaseException('Failed to retrieve all words: $e', originalError: e);
    }
  }

  @override
  Future<WordModel?> getWordById(String id) async {
    try {
      return _box.get(id);
    } catch (e) {
      throw DatabaseException('Failed to retrieve word by id ($id): $e', originalError: e);
    }
  }

  @override
  Future<List<WordModel>> getWordsByDeck(String deckId) async {
    try {
      final words = _box.values.where((word) => word.deckId == deckId).toList();
      // Sort newest created first
      words.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return words;
    } catch (e) {
      throw DatabaseException('Failed to retrieve words for deck ($deckId): $e', originalError: e);
    }
  }

  @override
  Future<List<WordModel>> getWordsByStatus(String deckId, WordStatus status) async {
    try {
      return _box.values
          .where((w) => w.deckId == deckId && w.status == status)
          .toList();
    } catch (e) {
      throw DatabaseException(
        'Failed to retrieve words by status (${status.value}) for deck ($deckId): $e',
        originalError: e,
      );
    }
  }

  @override
  Future<List<WordModel>> searchWords(String query, {String? deckId}) async {
    try {
      final normalizedQuery = query.toLowerCase().trim();
      if (normalizedQuery.isEmpty) {
        return deckId != null ? await getWordsByDeck(deckId) : await getAllWords();
      }

      return _box.values.where((word) {
        final matchesDeck = deckId == null || word.deckId == deckId;
        if (!matchesDeck) return false;

        final matchesTerm = word.term.toLowerCase().contains(normalizedQuery);
        final matchesDef = word.definitionVi.toLowerCase().contains(normalizedQuery);
        final matchesPhonetic = word.phonetic.toLowerCase().contains(normalizedQuery);
        final matchesNote = word.note?.toLowerCase().contains(normalizedQuery) ?? false;

        return matchesTerm || matchesDef || matchesPhonetic || matchesNote;
      }).toList();
    } catch (e) {
      throw DatabaseException('Failed to search words with query "$query": $e', originalError: e);
    }
  }

  @override
  Future<void> createWord(WordModel word) async {
    try {
      await _box.put(word.id, word);
    } catch (e) {
      throw DatabaseException('Failed to create word (${word.term}): $e', originalError: e);
    }
  }

  @override
  Future<void> createWordsBatch(List<WordModel> words) async {
    try {
      final entries = {for (final w in words) w.id: w};
      await _box.putAll(entries);
    } catch (e) {
      throw DatabaseException('Failed to batch create words: $e', originalError: e);
    }
  }

  @override
  Future<void> updateWord(WordModel word) async {
    try {
      if (!_box.containsKey(word.id)) {
        throw NotFoundException('Word not found with id: ${word.id}');
      }
      final updated = word.copyWith(updatedAt: DateTime.now());
      await _box.put(updated.id, updated);
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to update word (${word.id}): $e', originalError: e);
    }
  }

  @override
  Future<void> updateWordStatus(String wordId, WordStatus newStatus) async {
    try {
      final existing = _box.get(wordId);
      if (existing == null) {
        throw NotFoundException('Word not found with id: $wordId');
      }
      final updated = existing.copyWith(
        status: newStatus,
        updatedAt: DateTime.now(),
      );
      await _box.put(wordId, updated);
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to update status for word ($wordId): $e', originalError: e);
    }
  }

  @override
  Future<void> deleteWord(String id) async {
    try {
      if (!_box.containsKey(id)) {
        throw NotFoundException('Word not found with id: $id');
      }
      await _box.delete(id);
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to delete word ($id): $e', originalError: e);
    }
  }

  @override
  Future<void> deleteWordsByDeck(String deckId) async {
    try {
      final keysToDelete = <dynamic>[];
      for (final entry in _box.toMap().entries) {
        if (entry.value.deckId == deckId) {
          keysToDelete.add(entry.key);
        }
      }
      if (keysToDelete.isNotEmpty) {
        await _box.deleteAll(keysToDelete);
      }
    } catch (e) {
      throw DatabaseException('Failed to delete words for deck ($deckId): $e', originalError: e);
    }
  }

  @override
  Future<int> getWordCount({String? deckId}) async {
    try {
      if (deckId == null) return _box.length;
      return _box.values.where((w) => w.deckId == deckId).length;
    } catch (e) {
      throw DatabaseException('Failed to count words: $e', originalError: e);
    }
  }

  @override
  Future<Map<WordStatus, int>> getStatusCounts(String deckId) async {
    try {
      final words = _box.values.where((w) => w.deckId == deckId);
      final counts = <WordStatus, int>{
        WordStatus.newWord: 0,
        WordStatus.learning: 0,
        WordStatus.mastered: 0,
      };

      for (final w in words) {
        counts[w.status] = (counts[w.status] ?? 0) + 1;
      }
      return counts;
    } catch (e) {
      throw DatabaseException('Failed to get status counts for deck ($deckId): $e', originalError: e);
    }
  }

  @override
  Stream<List<WordModel>> watchWordsByDeck(String deckId) async* {
    yield await getWordsByDeck(deckId);
    yield* _box.watch().asyncMap((_) => getWordsByDeck(deckId));
  }
}
