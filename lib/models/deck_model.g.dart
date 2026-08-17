// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deck_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class DeckModelAdapter extends TypeAdapter<DeckModel> {
  @override
  final int typeId = 2;

  @override
  DeckModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return DeckModel(
      id: fields[0] as String,
      title: fields[1] as String,
      description: fields[2] as String,
      colorCode: fields[3] as int,
      createdAt: fields[4] as DateTime,
      userId: fields[5] as String,
      updatedAt: fields[6] as DateTime?,
      isDeleted: fields[7] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, DeckModel obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.title)
      ..writeByte(2)
      ..write(obj.description)
      ..writeByte(3)
      ..write(obj.colorCode)
      ..writeByte(4)
      ..write(obj.createdAt)
      ..writeByte(5)
      ..write(obj.userId)
      ..writeByte(6)
      ..write(obj.updatedAt)
      ..writeByte(7)
      ..write(obj.isDeleted);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeckModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
