import 'dart:io';
import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';

import '../models/deck_model.dart';
import '../models/word_model.dart';
import '../models/word_status.dart';

/// Result object returned from [ExcelService.importWordsFromExcel].
class ExcelImportResult {
  final List<WordModel> importedWords;
  final int skippedCount;
  final List<String> errors;
  final List<String> unrecognizedColumns;
  final List<String> recognizedColumns;

  const ExcelImportResult({
    required this.importedWords,
    required this.skippedCount,
    required this.errors,
    this.unrecognizedColumns = const [],
    this.recognizedColumns = const [],
  });

  bool get isSuccess => importedWords.isNotEmpty;
  int get totalProcessed => importedWords.length + skippedCount;

  @override
  String toString() =>
      'ExcelImportResult(imported: ${importedWords.length}, skipped: $skippedCount, errors: ${errors.length}, unrecognized: $unrecognizedColumns)';
}

/// Service handling Cross-Platform Excel (.xlsx) Import, Export, and Template generation.
///
/// Features:
/// 1. True separate columns for every metadata field.
/// 2. Position-independent column parsing (any order is allowed).
/// 3. Only `Term` and `Definition` are mandatory; all other 9 columns are completely optional.
/// 4. Validates column headers and reports any misspelled / unrecognized column names.
class ExcelService {
  final Uuid _uuid;

  ExcelService({Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  /// Standard column definitions
  static const List<String> standardHeaders = [
    'Term',           // Cột 1: Từ vựng tiếng Anh (BẮT BUỘC)
    'PartOfSpeech',   // Cột 2: Từ loại (tùy chọn)
    'Phonetic',       // Cột 3: Phiên âm IPA (tùy chọn)
    'Definition',     // Cột 4: Định nghĩa tiếng Việt (BẮT BUỘC)
    'CEFR',           // Cột 5: Cấp độ (A1, A2, B1, B2, C1, C2) (tùy chọn)
    'Example',        // Cột 6: Câu ví dụ (tùy chọn)
    'Synonyms',       // Cột 7: Từ đồng nghĩa (tùy chọn)
    'Antonyms',       // Cột 8: Từ trái nghĩa (tùy chọn)
    'Collocations',   // Cột 9: Cụm từ đi kèm (tùy chọn)
    'Note',           // Cột 10: Ghi chú / Mẹo nhớ (tùy chọn)
    'Status',         // Cột 11: Trạng thái (tùy chọn)
  ];

  // Alias dictionary for flexible column recognition (ignores accents, case, and spacing)
  static final Map<String, List<String>> _columnAliases = {
    'term': [
      'term', 'từ vựng', 'tu vung', 'từ tiếng anh', 'tu tieng anh', 'word', 'vocabulary', 'từ', 'tu', 'english'
    ],
    'partOfSpeech': [
      'partofspeech', 'pos', 'từ loại', 'tu loai', 'loại từ', 'loai tu', 'type', 'word type', 'từ_loại'
    ],
    'phonetic': [
      'phonetic', 'ipa', 'phiên âm', 'phien am', 'phát âm', 'phat am', 'pronunciation', 'sound'
    ],
    'definition': [
      'definition', 'definitionvi', 'định nghĩa', 'dinh nghia', 'nghĩa', 'nghia', 'nghĩa tiếng việt', 'nghia tieng viet', 'meaning', 'vietnamese', 'dịch'
    ],
    'cefr': [
      'cefr', 'cefrlevel', 'cấp độ', 'cap do', 'trình độ', 'trinh do', 'level', 'band', 'grade'
    ],
    'example': [
      'example', 'examplesentence', 'ví dụ', 'vi du', 'câu ví dụ', 'cau vi du', 'sentence', 'sample'
    ],
    'synonyms': [
      'synonyms', 'synonym', 'đồng nghĩa', 'dong nghia', 'từ đồng nghĩa', 'tu dong nghia', 'syn', 'syns'
    ],
    'antonyms': [
      'antonyms', 'antonym', 'trái nghĩa', 'trai nghia', 'từ trái nghĩa', 'tu trai nghia', 'ant', 'ants'
    ],
    'collocations': [
      'collocations', 'collocation', 'cụm từ', 'cum tu', 'cụm từ đi kèm', 'cum tu di kem', 'coll', 'colls', 'phrases'
    ],
    'note': [
      'note', 'notes', 'ghi chú', 'ghi chu', 'mẹo nhớ', 'meo nho', 'mẹo', 'meo', 'comment'
    ],
    'status': [
      'status', 'trạng thái', 'trang thai', 'tình trạng', 'tinh trang', 'tiến độ', 'tien do'
    ],
  };

  // ===========================================================================
  // 1. EXPORT FUNCTIONALITY
  // ===========================================================================

  /// Exports [words] in a [deck] to an Excel (.xlsx) file with separate dedicated columns.
  Future<String?> exportDeckToExcel(DeckModel deck, List<WordModel> words) async {
    try {
      final excel = Excel.createExcel();
      final sheetName = _sanitizeSheetName(deck.title.isNotEmpty ? deck.title : 'Vocabulary');

      final defaultSheet = excel.getDefaultSheet();
      if (defaultSheet != null && defaultSheet != sheetName) {
        excel.rename(defaultSheet, sheetName);
      }
      final sheet = excel[sheetName];

      // 1. Header Row
      final headerRow = standardHeaders.map<CellValue>((h) => TextCellValue(h)).toList();
      sheet.appendRow(headerRow);

      for (var col = 0; col < standardHeaders.length; col++) {
        final cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: col, rowIndex: 0));
        cell.cellStyle = CellStyle(
          bold: true,
          fontColorHex: ExcelColor.white,
          backgroundColorHex: ExcelColor.fromInt(0xFF4F46E5),
          horizontalAlign: HorizontalAlign.Center,
          verticalAlign: VerticalAlign.Center,
        );
      }

      // 2. Data Rows
      for (final word in words) {
        final row = <CellValue>[
          TextCellValue(word.term),
          TextCellValue(word.partOfSpeech),
          TextCellValue(word.phonetic),
          TextCellValue(word.definitionVi),
          TextCellValue(word.cefrLevel ?? ''),
          TextCellValue(word.exampleSentence ?? ''),
          TextCellValue(word.synonyms.join(', ')),
          TextCellValue(word.antonyms.join(', ')),
          TextCellValue(word.collocations.join(', ')),
          TextCellValue(word.note ?? ''),
          TextCellValue(word.status.labelVi),
        ];
        sheet.appendRow(row);
      }

      final fileBytes = excel.save();
      if (fileBytes == null || fileBytes.isEmpty) {
        throw Exception('Failed to generate Excel binary data.');
      }

      final sanitizedFileName =
          '${deck.title.replaceAll(RegExp(r'[^\w\s-]'), '_').trim()}_vocab.xlsx';

      return await _saveOrShareFile(fileBytes, sanitizedFileName, deck.title, words.length);
    } catch (e, stackTrace) {
      debugPrint('[ExcelService] Export failed: $e\n$stackTrace');
      rethrow;
    }
  }

  /// Exports an empty pre-formatted Excel template with sample rows and clear separate columns.
  Future<String?> exportSampleTemplate() async {
    try {
      final excel = Excel.createExcel();
      const sheetName = 'VocaFlow_Template';

      final defaultSheet = excel.getDefaultSheet();
      if (defaultSheet != null && defaultSheet != sheetName) {
        excel.rename(defaultSheet, sheetName);
      }
      final sheet = excel[sheetName];

      // Header Row
      final headerRow = standardHeaders.map<CellValue>((h) => TextCellValue(h)).toList();
      sheet.appendRow(headerRow);

      for (var col = 0; col < standardHeaders.length; col++) {
        final cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: col, rowIndex: 0));
        cell.cellStyle = CellStyle(
          bold: true,
          fontColorHex: ExcelColor.white,
          backgroundColorHex: ExcelColor.fromInt(0xFF4F46E5),
          horizontalAlign: HorizontalAlign.Center,
          verticalAlign: VerticalAlign.Center,
        );
      }

      // Sample Rows
      final sampleRows = [
        [
          TextCellValue('Ubiquitous'),
          TextCellValue('adjective'),
          TextCellValue('/juːˈbɪk.wə.təs/'),
          TextCellValue('Có mặt ở khắp mọi nơi cùng một lúc'),
          TextCellValue('C1'),
          TextCellValue('Smartphones have become ubiquitous in daily life.'),
          TextCellValue('omnipresent, pervasive, universal'),
          TextCellValue('rare, scarce'),
          TextCellValue('ubiquitous presence, become ubiquitous'),
          TextCellValue('Mẹo nhớ: U ở khắp mọi nơi'),
          TextCellValue('Mới'),
        ],
        [
          TextCellValue('Resilient'),
          TextCellValue('adjective'),
          TextCellValue('/rɪˈzɪl.jənt/'),
          TextCellValue('Kiên cường, phục hồi nhanh chóng'),
          TextCellValue('B2'),
          TextCellValue('The local economy proved remarkably resilient.'),
          TextCellValue('tough, adaptable, buoyant'),
          TextCellValue('fragile, vulnerable, weak'),
          TextCellValue('resilient economy, highly resilient'),
          TextCellValue('Dùng trong IELTS Writing Task 2'),
          TextCellValue('Đang học'),
        ],
        [
          TextCellValue('Eloquent'),
          TextCellValue('adjective'),
          TextCellValue('/ˈel.ə.kwənt/'),
          TextCellValue('Hùng biện, ăn nói lưu loát và truyền cảm'),
          TextCellValue('C1'),
          TextCellValue('She gave an eloquent speech that moved everyone.'),
          TextCellValue('articulate, expressive, fluent'),
          TextCellValue('inarticulate, hesitant'),
          TextCellValue('eloquent speaker, eloquent plea'),
          TextCellValue('Thường miêu tả bài phát biểu hoặc người diễn giải'),
          TextCellValue('Mới'),
        ],
      ];

      for (final row in sampleRows) {
        sheet.appendRow(row);
      }

      final fileBytes = excel.save();
      if (fileBytes == null || fileBytes.isEmpty) {
        throw Exception('Failed to generate Excel template data.');
      }

      const fileName = 'VocaFlow_Mau_Nhap_Tu_Vung.xlsx';
      return await _saveOrShareFile(fileBytes, fileName, 'Mẫu nhập từ vựng', 3);
    } catch (e, stackTrace) {
      debugPrint('[ExcelService] Template export failed: $e\n$stackTrace');
      rethrow;
    }
  }

  // ===========================================================================
  // 2. IMPORT FUNCTIONALITY (FLEXIBLE, POSITION-INDEPENDENT)
  // ===========================================================================

  /// Opens file picker to select an `.xlsx` file and parses rows into [WordModel]s for [deckId].
  Future<ExcelImportResult> importWordsFromExcel(String deckId) async {
    final importedWords = <WordModel>[];
    final errors = <String>[];
    final unrecognizedColumns = <String>[];
    final recognizedColumns = <String>[];
    int skippedCount = 0;

    try {
      final pickResult = await FilePicker.platform.pickFiles(
        dialogTitle: 'Chọn file Excel (.xlsx) từ vựng',
        type: FileType.custom,
        allowedExtensions: ['xlsx'],
        withData: true,
      );

      if (pickResult == null || pickResult.files.isEmpty) {
        debugPrint('[ExcelService] Import cancelled by user.');
        return const ExcelImportResult(importedWords: [], skippedCount: 0, errors: []);
      }

      final pickedFile = pickResult.files.first;
      Uint8List? bytes = pickedFile.bytes;

      if (bytes == null && pickedFile.path != null) {
        final file = File(pickedFile.path!);
        bytes = await file.readAsBytes();
      }

      if (bytes == null || bytes.isEmpty) {
        return const ExcelImportResult(
          importedWords: [],
          skippedCount: 0,
          errors: ['Không thể đọc dữ liệu từ file được chọn.'],
        );
      }

      final excel = Excel.decodeBytes(bytes);
      if (excel.tables.isEmpty) {
        return const ExcelImportResult(
          importedWords: [],
          skippedCount: 0,
          errors: ['File Excel không chứa bảng tính (Sheet) nào.'],
        );
      }

      Sheet? targetSheet;
      for (final table in excel.tables.values) {
        if (table.rows.isNotEmpty) {
          targetSheet = table;
          break;
        }
      }

      if (targetSheet == null || targetSheet.rows.isEmpty) {
        return const ExcelImportResult(
          importedWords: [],
          skippedCount: 0,
          errors: ['Bảng tính Excel không có dữ liệu dòng nào.'],
        );
      }

      final rows = targetSheet.rows;
      if (rows.isEmpty) {
        return const ExcelImportResult(
          importedWords: [],
          skippedCount: 0,
          errors: ['Bảng tính rỗng.'],
        );
      }

      // 1. Scan for Header Row in the first 5 rows
      int headerRowIndex = -1;
      final headerKeyMap = <String, int>{}; // Maps standard field key -> column index

      for (var rIdx = 0; rIdx < rows.length && rIdx < 5; rIdx++) {
        final row = rows[rIdx];
        final tempMap = <String, int>{};
        final tempUnrecognized = <String>[];
        final tempRecognized = <String>[];

        for (var cIdx = 0; cIdx < row.length; cIdx++) {
          final cellText = _extractCellValue(row[cIdx]).trim();
          if (cellText.isEmpty) continue;

          final matchedKey = _matchColumnKey(cellText);
          if (matchedKey != null) {
            tempMap[matchedKey] = cIdx;
            tempRecognized.add('$cellText (Cột ${String.fromCharCode(65 + cIdx)})');
          } else {
            tempUnrecognized.add('$cellText (Cột ${String.fromCharCode(65 + cIdx)})');
          }
        }

        // A valid header row MUST at least identify "term" or "definition"
        if (tempMap.containsKey('term') || tempMap.containsKey('definition')) {
          headerRowIndex = rIdx;
          headerKeyMap.addAll(tempMap);
          unrecognizedColumns.addAll(tempUnrecognized);
          recognizedColumns.addAll(tempRecognized);
          break;
        }
      }

      // 2. Validate Required Columns
      if (headerRowIndex == -1 || !headerKeyMap.containsKey('term')) {
        return ExcelImportResult(
          importedWords: [],
          skippedCount: 0,
          errors: [
            'Không tìm thấy cột bắt buộc "Term" (Từ vựng tiếng Anh) trong file Excel.\n'
            'Vui lòng đảm bảo có một cột tên là "Term" hoặc "Từ vựng".'
          ],
          unrecognizedColumns: unrecognizedColumns,
          recognizedColumns: recognizedColumns,
        );
      }

      if (!headerKeyMap.containsKey('definition')) {
        return ExcelImportResult(
          importedWords: [],
          skippedCount: 0,
          errors: [
            'Không tìm thấy cột bắt buộc "Definition" (Định nghĩa tiếng Việt) trong file Excel.\n'
            'Vui lòng đảm bảo có một cột tên là "Definition" hoặc "Định nghĩa" / "Nghĩa".'
          ],
          unrecognizedColumns: unrecognizedColumns,
          recognizedColumns: recognizedColumns,
        );
      }

      // Column Indices (null if not present in the Excel file)
      final termCol = headerKeyMap['term']!;
      final defCol = headerKeyMap['definition']!;
      final posCol = headerKeyMap['partOfSpeech'];
      final phoneticCol = headerKeyMap['phonetic'];
      final cefrCol = headerKeyMap['cefr'];
      final exampleCol = headerKeyMap['example'];
      final synCol = headerKeyMap['synonyms'];
      final antCol = headerKeyMap['antonyms'];
      final collCol = headerKeyMap['collocations'];
      final noteCol = headerKeyMap['note'];
      final statusCol = headerKeyMap['status'];

      // 3. Parse Data Rows (position-independent!)
      for (var rowIdx = headerRowIndex + 1; rowIdx < rows.length; rowIdx++) {
        final row = rows[rowIdx];
        if (row.isEmpty) {
          skippedCount++;
          continue;
        }

        final term = _getCellValueByIndex(row, termCol);
        final def = _getCellValueByIndex(row, defCol);

        if (term.isEmpty && def.isEmpty) {
          skippedCount++;
          continue;
        }

        if (term.isEmpty) {
          errors.add('Dòng ${rowIdx + 1}: Bỏ qua vì thiếu từ tiếng Anh (Term).');
          skippedCount++;
          continue;
        }

        if (def.isEmpty) {
          errors.add('Dòng ${rowIdx + 1} ("$term"): Bỏ qua vì thiếu nghĩa tiếng Việt (Definition).');
          skippedCount++;
          continue;
        }

        final partOfSpeech = posCol != null ? _getCellValueByIndex(row, posCol) : 'noun';
        final phonetic = phoneticCol != null ? _getCellValueByIndex(row, phoneticCol) : '';
        final cefrStr = cefrCol != null ? _getCellValueByIndex(row, cefrCol) : '';
        final example = exampleCol != null ? _getCellValueByIndex(row, exampleCol) : '';
        final synonymsStr = synCol != null ? _getCellValueByIndex(row, synCol) : '';
        final antonymsStr = antCol != null ? _getCellValueByIndex(row, antCol) : '';
        final collocationsStr = collCol != null ? _getCellValueByIndex(row, collCol) : '';
        final note = noteCol != null ? _getCellValueByIndex(row, noteCol) : '';
        final statusStr = statusCol != null ? _getCellValueByIndex(row, statusCol) : '';

        final word = WordModel(
          id: _uuid.v4(),
          deckId: deckId,
          term: term,
          partOfSpeech: partOfSpeech.isNotEmpty ? partOfSpeech : 'noun',
          phonetic: phonetic,
          definitionVi: def,
          exampleSentence: example.isNotEmpty ? example : null,
          note: note.isNotEmpty ? note : null,
          status: _parseWordStatus(statusStr),
          createdAt: DateTime.now(),
          synonyms: _splitList(synonymsStr),
          antonyms: _splitList(antonymsStr),
          collocations: _splitList(collocationsStr),
          cefrLevel: cefrStr.isNotEmpty ? cefrStr.toUpperCase() : null,
        );

        importedWords.add(word);
      }

      debugPrint('[ExcelService] Successfully imported ${importedWords.length} words.');
      return ExcelImportResult(
        importedWords: importedWords,
        skippedCount: skippedCount,
        errors: errors,
        unrecognizedColumns: unrecognizedColumns,
        recognizedColumns: recognizedColumns,
      );
    } catch (e, stackTrace) {
      debugPrint('[ExcelService] Import exception: $e\n$stackTrace');
      return ExcelImportResult(
        importedWords: importedWords,
        skippedCount: skippedCount,
        errors: ['Lỗi xử lý file Excel: $e'],
      );
    }
  }

  // ===========================================================================
  // HELPER UTILITIES
  // ===========================================================================

  static String? _matchColumnKey(String rawHeader) {
    final clean = _normalizeText(rawHeader);
    for (final entry in _columnAliases.entries) {
      for (final alias in entry.value) {
        if (clean == _normalizeText(alias) || clean.contains(_normalizeText(alias))) {
          return entry.key;
        }
      }
    }
    return null;
  }

  static String _normalizeText(String str) {
    var s = str.toLowerCase().trim();
    s = s.replaceAll(RegExp(r'[àáạảãâầấậẩẫăằắặẳẵ]'), 'a');
    s = s.replaceAll(RegExp(r'[èéẹẻẽêềếệểễ]'), 'e');
    s = s.replaceAll(RegExp(r'[ìíịỉĩ]'), 'i');
    s = s.replaceAll(RegExp(r'[òóọỏõôồốộổỗơờớợởỡ]'), 'o');
    s = s.replaceAll(RegExp(r'[ùúụủũưừứựửữ]'), 'u');
    s = s.replaceAll(RegExp(r'[ỳýỵỷỹ]'), 'y');
    s = s.replaceAll(RegExp(r'[đ]'), 'd');
    s = s.replaceAll(RegExp(r'[^a-z0-9]'), '');
    return s;
  }

  Future<String?> _saveOrShareFile(
    List<int> fileBytes,
    String fileName,
    String deckTitle,
    int wordCount,
  ) async {
    final isDesktop = !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);

    if (isDesktop) {
      final savePath = await FilePicker.platform.saveFile(
        dialogTitle: 'Chọn nơi lưu file từ vựng Excel',
        fileName: fileName,
        type: FileType.custom,
        allowedExtensions: ['xlsx'],
      );

      if (savePath == null) return null;

      final targetPath = savePath.endsWith('.xlsx') ? savePath : '$savePath.xlsx';
      final file = File(targetPath);
      await file.writeAsBytes(fileBytes, flush: true);
      return targetPath;
    } else {
      final tempDir = await getTemporaryDirectory();
      final filePath = '${tempDir.path}${Platform.pathSeparator}$fileName';
      final file = File(filePath);
      await file.writeAsBytes(fileBytes, flush: true);

      final xFile = XFile(
        filePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: fileName,
      );

      await Share.shareXFiles(
        [xFile],
        text: 'VocaFlow - $deckTitle ($wordCount từ)',
        subject: 'Xuất file từ vựng $deckTitle',
      );

      return filePath;
    }
  }

  static String _sanitizeSheetName(String raw) {
    var clean = raw.replaceAll(RegExp(r'[\\/*?:\[\]]'), '_').trim();
    if (clean.length > 31) clean = clean.substring(0, 31);
    return clean.isNotEmpty ? clean : 'Sheet1';
  }

  static String _extractCellValue(Data? cell) {
    if (cell == null || cell.value == null) return '';
    final val = cell.value;
    if (val is TextCellValue) return val.value.text ?? '';
    return val.toString().trim();
  }

  static String _getCellValueByIndex(List<Data?> row, int colIndex) {
    if (colIndex < 0 || colIndex >= row.length) return '';
    return _extractCellValue(row[colIndex]);
  }

  static List<String> _splitList(String raw) {
    if (raw.trim().isEmpty) return const [];
    return raw
        .split(RegExp(r'[,;\n\r|]+'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
  }

  static WordStatus _parseWordStatus(String raw) {
    final lower = raw.toLowerCase().trim();
    if (lower.contains('master') || lower.contains('thuộc') || lower.contains('thuoc') || lower.contains('done')) {
      return WordStatus.mastered;
    }
    if (lower.contains('learn') || lower.contains('học') || lower.contains('hoc') || lower.contains('review')) {
      return WordStatus.learning;
    }
    return WordStatus.newWord;
  }
}
