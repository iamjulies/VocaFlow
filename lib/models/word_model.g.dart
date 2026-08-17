// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'word_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class WordModelAdapter extends TypeAdapter<WordModel> {
  @override
  final int typeId = 1;

  @override
  WordModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return WordModel(
      id: fields[0] as String,
      deckId: fields[1] as String,
      term: fields[2] as String,
      partOfSpeech: fields[3] as String,
      phonetic: fields[4] as String,
      definitionVi: fields[5] as String,
      exampleSentence: fields[6] as String?,
      note: fields[7] as String?,
      status: fields[8] as WordStatus,
      createdAt: fields[9] as DateTime,
      userId: fields[15] as String,
      updatedAt: fields[10] as DateTime?,
      isDeleted: fields[16] as bool,
      masteryScore: fields[17] as int,
      synonyms: (fields[11] as List).cast<String>(),
      antonyms: (fields[12] as List).cast<String>(),
      collocations: (fields[13] as List).cast<String>(),
      cefrLevel: fields[14] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, WordModel obj) {
    writer
      ..writeByte(18)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.deckId)
      ..writeByte(2)
      ..write(obj.term)
      ..writeByte(3)
      ..write(obj.partOfSpeech)
      ..writeByte(4)
      ..write(obj.phonetic)
      ..writeByte(5)
      ..write(obj.definitionVi)
      ..writeByte(6)
      ..write(obj.exampleSentence)
      ..writeByte(7)
      ..write(obj.note)
      ..writeByte(8)
      ..write(obj.status)
      ..writeByte(9)
      ..write(obj.createdAt)
      ..writeByte(10)
      ..write(obj.updatedAt)
      ..writeByte(11)
      ..write(obj.synonyms)
      ..writeByte(12)
      ..write(obj.antonyms)
      ..writeByte(13)
      ..write(obj.collocations)
      ..writeByte(14)
      ..write(obj.cefrLevel)
      ..writeByte(15)
      ..write(obj.userId)
      ..writeByte(16)
      ..write(obj.isDeleted)
      ..writeByte(17)
      ..write(obj.masteryScore);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WordModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
