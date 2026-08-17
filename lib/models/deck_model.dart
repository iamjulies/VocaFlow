import 'package:hive/hive.dart';

part 'deck_model.g.dart';

/// Represents a vocabulary Deck (Bộ từ) in VocaFlow.
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
  final DateTime? updatedAt;

  const DeckModel({
    required this.id,
    required this.title,
    this.description = '',
    this.colorCode = 0xFF4F46E5, // Default Indigo
    required this.createdAt,
    this.updatedAt,
  });

  /// Creates a copy of [DeckModel] with optional mutated fields.
  DeckModel copyWith({
    String? id,
    String? title,
    String? description,
    int? colorCode,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return DeckModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      colorCode: colorCode ?? this.colorCode,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Deserializes a [Map<String, dynamic>] into a [DeckModel].
  factory DeckModel.fromJson(Map<String, dynamic> json) {
    return DeckModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      colorCode: json['colorCode'] is int
          ? json['colorCode'] as int
          : int.tryParse(json['colorCode']?.toString() ?? '') ?? 0xFF4F46E5,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
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
      'updatedAt': updatedAt?.toIso8601String(),
    };
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
          updatedAt == other.updatedAt;

  @override
  int get hashCode =>
      id.hashCode ^
      title.hashCode ^
      description.hashCode ^
      colorCode.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode;

  @override
  String toString() {
    return 'DeckModel(id: $id, title: $title, description: $description, colorCode: 0x${colorCode.toRadixString(16).toUpperCase()}, createdAt: $createdAt)';
  }
}
