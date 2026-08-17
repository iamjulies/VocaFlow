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

/// Hive implementation of [WordRepository] with Soft-Delete Tombstone support for Cloud Sync.
class HiveWordRepository implements WordRepository {
  final DatabaseService _dbService;

  HiveWordRepository({DatabaseService? dbService})
      : _dbService = dbService ?? DatabaseService.instance;

  Box<WordModel> get _box => _dbService.wordsBox;

  @override
  Future<List<WordModel>> getAllWords() async {
    try {
      return _box.values.where((w) => !w.isDeleted).toList();
    } catch (e) {
      throw DatabaseException('Failed to retrieve all words: $e', originalError: e);
    }
  }

  @override
  Future<WordModel?> getWordById(String id) async {
    try {
      final word = _box.get(id);
      if (word == null || word.isDeleted) return null;
      return word;
    } catch (e) {
      throw DatabaseException('Failed to retrieve word by id ($id): $e', originalError: e);
    }
  }

  @override
  Future<List<WordModel>> getWordsByDeck(String deckId) async {
    try {
      final words = _box.values
          .where((word) => word.deckId == deckId && !word.isDeleted)
          .toList();
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
          .where((w) => w.deckId == deckId && !w.isDeleted && w.status == status)
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
        if (word.isDeleted) return false;
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
      final newWord = word.copyWith(
        updatedAt: DateTime.now(),
        isDeleted: false,
      );
      await _box.put(newWord.id, newWord);
    } catch (e) {
      throw DatabaseException('Failed to create word (${word.term}): $e', originalError: e);
    }
  }

  @override
  Future<void> createWordsBatch(List<WordModel> words) async {
    try {
      final now = DateTime.now();
      final entries = {
        for (final w in words)
          w.id: w.copyWith(
            updatedAt: now,
            isDeleted: false,
          )
      };
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
      final updated = word.copyWith(
        updatedAt: DateTime.now(),
        isDeleted: false,
      );
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
      final existing = _box.get(id);
      if (existing == null) {
        throw NotFoundException('Word not found with id: $id');
      }
      // Soft-delete for Cloud Sync
      final softDeleted = existing.copyWith(
        isDeleted: true,
        updatedAt: DateTime.now(),
      );
      await _box.put(id, softDeleted);
    } catch (e) {
      if (e is NotFoundException) rethrow;
      throw DatabaseException('Failed to delete word ($id): $e', originalError: e);
    }
  }

  @override
  Future<void> deleteWordsByDeck(String deckId) async {
    try {
      final now = DateTime.now();
      for (final entry in _box.toMap().entries) {
        if (entry.value.deckId == deckId && !entry.value.isDeleted) {
          final softDeleted = entry.value.copyWith(
            isDeleted: true,
            updatedAt: now,
          );
          await _box.put(entry.key, softDeleted);
        }
      }
    } catch (e) {
      throw DatabaseException('Failed to delete words for deck ($deckId): $e', originalError: e);
    }
  }

  @override
  Future<int> getWordCount({String? deckId}) async {
    try {
      if (deckId == null) return _box.values.where((w) => !w.isDeleted).length;
      return _box.values.where((w) => w.deckId == deckId && !w.isDeleted).length;
    } catch (e) {
      throw DatabaseException('Failed to count words: $e', originalError: e);
    }
  }

  @override
  Future<Map<WordStatus, int>> getStatusCounts(String deckId) async {
    try {
      final words = _box.values.where((w) => w.deckId == deckId && !w.isDeleted);
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
