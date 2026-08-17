import 'package:hive/hive.dart';

part 'word_status.g.dart';

/// Represents the learning status of a vocabulary word in VocaFlow.
@HiveType(typeId: 0)
enum WordStatus {
  @HiveField(0)
  newWord,

  @HiveField(1)
  learning,

  @HiveField(2)
  mastered;

  /// String value matching schema requirements: 'new' | 'learning' | 'mastered'
  String get value {
    switch (this) {
      case WordStatus.newWord:
        return 'new';
      case WordStatus.learning:
        return 'learning';
      case WordStatus.mastered:
        return 'mastered';
    }
  }

  /// Human-readable label in Vietnamese
  String get labelVi {
    switch (this) {
      case WordStatus.newWord:
        return 'Mới';
      case WordStatus.learning:
        return 'Đang học';
      case WordStatus.mastered:
        return 'Đã thuộc';
    }
  }

  /// Parses a string into [WordStatus] with safe fallback to [WordStatus.newWord].
  static WordStatus fromString(String? val) {
    if (val == null) return WordStatus.newWord;
    switch (val.toLowerCase().trim()) {
      case 'new':
      case 'newword':
        return WordStatus.newWord;
      case 'learning':
        return WordStatus.learning;
      case 'mastered':
        return WordStatus.mastered;
      default:
        return WordStatus.newWord;
    }
  }
}
