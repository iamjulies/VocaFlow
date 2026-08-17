import 'package:hive/hive.dart';
import 'word_status.dart';

part 'word_model.g.dart';

/// Represents a single vocabulary word in VocaFlow.
///
/// Upgraded in v0.0.2 for Cloud Firestore multi-device synchronization:
/// - [userId]: Owner account ID for user data isolation
/// - [updatedAt]: Timestamp for Conflict-Free Last-Write-Wins sync
/// - [isDeleted]: Soft delete flag for cross-device tombstone replication
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
  final DateTime updatedAt;

  @HiveField(11)
  final List<String> synonyms;

  @HiveField(12)
  final List<String> antonyms;

  @HiveField(13)
  final List<String> collocations;

  @HiveField(14)
  final String? cefrLevel;

  @HiveField(15)
  final String userId;

  @HiveField(16)
  final bool isDeleted;

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
    this.userId = '',
    DateTime? updatedAt,
    this.isDeleted = false,
    this.synonyms = const [],
    this.antonyms = const [],
    this.collocations = const [],
    this.cefrLevel,
  }) : updatedAt = updatedAt ?? createdAt;

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
    String? userId,
    DateTime? updatedAt,
    bool? isDeleted,
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
      userId: userId ?? this.userId,
      updatedAt: updatedAt ?? this.updatedAt,
      isDeleted: isDeleted ?? this.isDeleted,
      synonyms: synonyms ?? this.synonyms,
      antonyms: antonyms ?? this.antonyms,
      collocations: collocations ?? this.collocations,
      cefrLevel: cefrLevel ?? this.cefrLevel,
    );
  }

  /// Deserializes a [Map<String, dynamic>] into a [WordModel] with backward compatibility.
  factory WordModel.fromJson(Map<String, dynamic> json) {
    final created = json['createdAt'] != null
        ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
        : DateTime.now();

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
      createdAt: created,
      userId: json['userId'] as String? ?? '',
      updatedAt: json['updatedAt'] != null
          ? (DateTime.tryParse(json['updatedAt'].toString()) ?? created)
          : created,
      isDeleted: json['isDeleted'] as bool? ?? false,
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
      'userId': userId,
      'updatedAt': updatedAt.toIso8601String(),
      'isDeleted': isDeleted,
      'synonyms': synonyms,
      'antonyms': antonyms,
      'collocations': collocations,
      'cefrLevel': cefrLevel,
    };
  }

  /// Cloud Firestore Mapper: Serializes to Firestore Document Map.
  Map<String, dynamic> toFirestore() {
    return {
      'id': id,
      'deckId': deckId,
      'userId': userId,
      'term': term,
      'partOfSpeech': partOfSpeech,
      'phonetic': phonetic,
      'definitionVi': definitionVi,
      'exampleSentence': exampleSentence,
      'note': note,
      'status': status.value,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'isDeleted': isDeleted,
      'synonyms': synonyms,
      'antonyms': antonyms,
      'collocations': collocations,
      'cefrLevel': cefrLevel,
    };
  }

  /// Cloud Firestore Mapper: Deserializes from Firestore Document Data.
  factory WordModel.fromFirestore(Map<String, dynamic> data, [String? docId]) {
    final created = data['createdAt'] != null
        ? (DateTime.tryParse(data['createdAt'].toString()) ?? DateTime.now())
        : DateTime.now();

    return WordModel(
      id: docId ?? data['id'] as String? ?? '',
      deckId: data['deckId'] as String? ?? '',
      userId: data['userId'] as String? ?? '',
      term: data['term'] as String? ?? '',
      partOfSpeech: data['partOfSpeech'] as String? ?? '',
      phonetic: data['phonetic'] as String? ?? '',
      definitionVi: data['definitionVi'] as String? ?? '',
      exampleSentence: data['exampleSentence'] as String?,
      note: data['note'] as String?,
      status: WordStatus.fromString(data['status'] as String?),
      createdAt: created,
      updatedAt: data['updatedAt'] != null
          ? (DateTime.tryParse(data['updatedAt'].toString()) ?? created)
          : created,
      isDeleted: data['isDeleted'] as bool? ?? false,
      synonyms: (data['synonyms'] as List<dynamic>?)
              ?.map((e) => e.toString().trim())
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
      antonyms: (data['antonyms'] as List<dynamic>?)
              ?.map((e) => e.toString().trim())
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
      collocations: (data['collocations'] as List<dynamic>?)
              ?.map((e) => e.toString().trim())
              .where((e) => e.isNotEmpty)
              .toList() ??
          const [],
      cefrLevel: data['cefrLevel'] as String?,
    );
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
          userId == other.userId &&
          updatedAt == other.updatedAt &&
          isDeleted == other.isDeleted &&
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
      userId.hashCode ^
      updatedAt.hashCode ^
      isDeleted.hashCode ^
      Object.hashAll(synonyms) ^
      Object.hashAll(antonyms) ^
      Object.hashAll(collocations) ^
      cefrLevel.hashCode;

  @override
  String toString() {
    return 'WordModel(id: $id, userId: $userId, term: $term, isDeleted: $isDeleted, updatedAt: $updatedAt)';
  }
}
