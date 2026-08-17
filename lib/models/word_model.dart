import 'package:hive/hive.dart';
import 'word_status.dart';

part 'word_model.g.dart';

/// Represents a single vocabulary word in VocaFlow.
///
/// Designed to be offline-first, backward compatible, and ready for
/// advanced linguistics metadata (synonyms, antonyms, collocations, CEFR) and AI Tutor integrations.
@HiveType(typeId: 1)
class WordModel {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String deckId;

  @HiveField(2)
  final String term;

  @HiveField(3)
  final String partOfSpeech;

  @HiveField(4)
  final String phonetic;

  @HiveField(5)
  final String definitionVi;

  @HiveField(6)
  final String? exampleSentence;

  @HiveField(7)
  final String? note;

  @HiveField(8)
  final WordStatus status;

  @HiveField(9)
  final DateTime createdAt;

  @HiveField(10)
  final DateTime? updatedAt;

  @HiveField(11)
  final List<String> synonyms;

  @HiveField(12)
  final List<String> antonyms;

  @HiveField(13)
  final List<String> collocations;

  @HiveField(14)
  final String? cefrLevel;

  const WordModel({
    required this.id,
    required this.deckId,
    required this.term,
    this.partOfSpeech = '',
    this.phonetic = '',
    required this.definitionVi,
    this.exampleSentence,
    this.note,
    this.status = WordStatus.newWord,
    required this.createdAt,
    this.updatedAt,
    this.synonyms = const [],
    this.antonyms = const [],
    this.collocations = const [],
    this.cefrLevel,
  });

  /// Creates a copy of [WordModel] with optional mutated fields.
  WordModel copyWith({
    String? id,
    String? deckId,
    String? term,
    String? partOfSpeech,
    String? phonetic,
    String? definitionVi,
    String? exampleSentence,
    String? note,
    WordStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? synonyms,
    List<String>? antonyms,
    List<String>? collocations,
    String? cefrLevel,
  }) {
    return WordModel(
      id: id ?? this.id,
      deckId: deckId ?? this.deckId,
      term: term ?? this.term,
      partOfSpeech: partOfSpeech ?? this.partOfSpeech,
      phonetic: phonetic ?? this.phonetic,
      definitionVi: definitionVi ?? this.definitionVi,
      exampleSentence: exampleSentence ?? this.exampleSentence,
      note: note ?? this.note,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      synonyms: synonyms ?? this.synonyms,
      antonyms: antonyms ?? this.antonyms,
      collocations: collocations ?? this.collocations,
      cefrLevel: cefrLevel ?? this.cefrLevel,
    );
  }

  /// Deserializes a [Map<String, dynamic>] into a [WordModel] with backward compatibility.
  factory WordModel.fromJson(Map<String, dynamic> json) {
    return WordModel(
      id: json['id'] as String? ?? '',
      deckId: json['deckId'] as String? ?? '',
      term: json['term'] as String? ?? '',
      partOfSpeech: json['partOfSpeech'] as String? ?? '',
      phonetic: json['phonetic'] as String? ?? '',
      definitionVi: json['definitionVi'] as String? ?? '',
      exampleSentence: json['exampleSentence'] as String?,
      note: json['note'] as String?,
      status: WordStatus.fromString(json['status'] as String?),
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now())
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      synonyms: (json['synonyms'] as List<dynamic>?)
              ?.map((e) => e.toString().trim())
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
      antonyms: (json['antonyms'] as List<dynamic>?)
              ?.map((e) => e.toString().trim())
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
      collocations: (json['collocations'] as List<dynamic>?)
              ?.map((e) => e.toString().trim())
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
      cefrLevel: json['cefrLevel'] as String?,
    );
  }

  /// Serializes this [WordModel] to a [Map<String, dynamic>].
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'deckId': deckId,
      'term': term,
      'partOfSpeech': partOfSpeech,
      'phonetic': phonetic,
      'definitionVi': definitionVi,
      'exampleSentence': exampleSentence,
      'note': note,
      'status': status.value,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'synonyms': synonyms,
      'antonyms': antonyms,
      'collocations': collocations,
      'cefrLevel': cefrLevel,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WordModel &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          deckId == other.deckId &&
          term == other.term &&
          partOfSpeech == other.partOfSpeech &&
          phonetic == other.phonetic &&
          definitionVi == other.definitionVi &&
          exampleSentence == other.exampleSentence &&
          note == other.note &&
          status == other.status &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt &&
          _listEquals(synonyms, other.synonyms) &&
          _listEquals(antonyms, other.antonyms) &&
          _listEquals(collocations, other.collocations) &&
          cefrLevel == other.cefrLevel;

  static bool _listEquals(List<String> a, List<String> b) {
    if (identical(a, b)) return true;
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode =>
      id.hashCode ^
      deckId.hashCode ^
      term.hashCode ^
      partOfSpeech.hashCode ^
      phonetic.hashCode ^
      definitionVi.hashCode ^
      exampleSentence.hashCode ^
      note.hashCode ^
      status.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode ^
      Object.hashAll(synonyms) ^
      Object.hashAll(antonyms) ^
      Object.hashAll(collocations) ^
      cefrLevel.hashCode;

  @override
  String toString() {
    return 'WordModel(id: $id, deckId: $deckId, term: $term, partOfSpeech: $partOfSpeech, phonetic: $phonetic, definitionVi: $definitionVi, status: ${status.value}, cefrLevel: $cefrLevel, synonyms: $synonyms, antonyms: $antonyms, collocations: $collocations, createdAt: $createdAt)';
  }
}
