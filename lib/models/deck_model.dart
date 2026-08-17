import 'package:hive/hive.dart';

part 'deck_model.g.dart';

/// Represents a vocabulary Deck (Bộ từ) in VocaFlow.
///
/// Upgraded in v0.0.2 for Cloud Firestore multi-device synchronization:
/// - [userId]: Owner account ID for security rules
/// - [updatedAt]: Timestamp for Conflict-Free Last-Write-Wins sync
/// - [isDeleted]: Soft delete flag for cross-device tombstone replication
@HiveType(typeId: 2)
class DeckModel {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String title;

  @HiveField(2)
  final String description;

  @HiveField(3)
  final int colorCode;

  @HiveField(4)
  final DateTime createdAt;

  @HiveField(5)
  final String userId;

  @HiveField(6)
  final DateTime updatedAt;

  @HiveField(7)
  final bool isDeleted;

  const DeckModel({
    required this.id,
    required this.title,
    this.description = '',
    this.colorCode = 0xFF4F46E5, // Default Indigo
    required this.createdAt,
    this.userId = '',
    DateTime? updatedAt,
    this.isDeleted = false,
  }) : updatedAt = updatedAt ?? createdAt;

  /// Creates a copy of [DeckModel] with optional mutated fields.
  DeckModel copyWith({
    String? id,
    String? title,
    String? description,
    int? colorCode,
    DateTime? createdAt,
    String? userId,
    DateTime? updatedAt,
    bool? isDeleted,
  }) {
    return DeckModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      colorCode: colorCode ?? this.colorCode,
      createdAt: createdAt ?? this.createdAt,
      userId: userId ?? this.userId,
      updatedAt: updatedAt ?? this.updatedAt,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  /// Deserializes a [Map<String, dynamic>] into a [DeckModel].
  factory DeckModel.fromJson(Map<String, dynamic> json) {
    final created = json['createdAt'] != null
        ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
        : DateTime.now();

    return DeckModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      colorCode: json['colorCode'] is int
          ? json['colorCode'] as int
          : int.tryParse(json['colorCode']?.toString() ?? '') ?? 0xFF4F46E5,
      createdAt: created,
      userId: json['userId'] as String? ?? '',
      updatedAt: json['updatedAt'] != null
          ? (DateTime.tryParse(json['updatedAt'].toString()) ?? created)
          : created,
      isDeleted: json['isDeleted'] as bool? ?? false,
    );
  }

  /// Serializes this [DeckModel] to a [Map<String, dynamic>].
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'colorCode': colorCode,
      'createdAt': createdAt.toIso8601String(),
      'userId': userId,
      'updatedAt': updatedAt.toIso8601String(),
      'isDeleted': isDeleted,
    };
  }

  /// Cloud Firestore Mapper: Serializes to Firestore Document Map.
  Map<String, dynamic> toFirestore() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'description': description,
      'colorCode': colorCode,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'isDeleted': isDeleted,
    };
  }

  /// Cloud Firestore Mapper: Deserializes from Firestore Document Data.
  factory DeckModel.fromFirestore(Map<String, dynamic> data, [String? docId]) {
    final created = data['createdAt'] != null
        ? (DateTime.tryParse(data['createdAt'].toString()) ?? DateTime.now())
        : DateTime.now();

    return DeckModel(
      id: docId ?? data['id'] as String? ?? '',
      userId: data['userId'] as String? ?? '',
      title: data['title'] as String? ?? '',
      description: data['description'] as String? ?? '',
      colorCode: data['colorCode'] is int
          ? data['colorCode'] as int
          : int.tryParse(data['colorCode']?.toString() ?? '') ?? 0xFF4F46E5,
      createdAt: created,
      updatedAt: data['updatedAt'] != null
          ? (DateTime.tryParse(data['updatedAt'].toString()) ?? created)
          : created,
      isDeleted: data['isDeleted'] as bool? ?? false,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeckModel &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          description == other.description &&
          colorCode == other.colorCode &&
          createdAt == other.createdAt &&
          userId == other.userId &&
          updatedAt == other.updatedAt &&
          isDeleted == other.isDeleted;

  @override
  int get hashCode =>
      id.hashCode ^
      title.hashCode ^
      description.hashCode ^
      colorCode.hashCode ^
      createdAt.hashCode ^
      userId.hashCode ^
      updatedAt.hashCode ^
      isDeleted.hashCode;

  @override
  String toString() {
    return 'DeckModel(id: $id, userId: $userId, title: $title, isDeleted: $isDeleted, updatedAt: $updatedAt)';
  }
}
