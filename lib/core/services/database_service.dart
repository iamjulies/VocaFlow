import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';

import '../constants/app_constants.dart';
import '../errors/app_exception.dart';
import '../../models/deck_model.dart';
import '../../models/word_model.dart';
import '../../models/word_status.dart';

/// Core Database Service managing Hive lifecycle and boxes for VocaFlow.
///
/// Supports Android, iOS, Windows Desktop, macOS, Linux, and Web out-of-the-box.
class DatabaseService {
  DatabaseService._internal();

  static final DatabaseService _instance = DatabaseService._internal();
  static DatabaseService get instance => _instance;

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  Box<DeckModel>? _decksBox;
  Box<WordModel>? _wordsBox;
  Box<dynamic>? _settingsBox;

  /// Direct accessor for the Decks box
  Box<DeckModel> get decksBox {
    _ensureInitialized();
    return _decksBox!;
  }

  /// Direct accessor for the Words box
  Box<WordModel> get wordsBox {
    _ensureInitialized();
    return _wordsBox!;
  }

  /// Direct accessor for the Settings box
  Box<dynamic> get settingsBox {
    _ensureInitialized();
    return _settingsBox!;
  }

  /// Initializes Hive storage and opens all essential boxes.
  ///
  /// [subDir]: Optional custom subdirectory for Hive storage.
  Future<void> init({String? subDir}) async {
    if (_isInitialized) {
      debugPrint('[DatabaseService] Hive is already initialized.');
      return;
    }

    try {
      debugPrint('[DatabaseService] Initializing Hive for platform: ${defaultTargetPlatform.name}...');
      
      // Initialize Hive with Flutter path resolution
      if (kIsWeb) {
        await Hive.initFlutter();
      } else {
        // Desktop (Windows/macOS/Linux) and Mobile (Android/iOS)
        final appDocDir = await getApplicationDocumentsDirectory();
        final storagePath = subDir != null 
            ? '${appDocDir.path}${Platform.pathSeparator}$subDir' 
            : '${appDocDir.path}${Platform.pathSeparator}VocaFlow';
        
        final storageDir = Directory(storagePath);
        if (!storageDir.existsSync()) {
          storageDir.createSync(recursive: true);
        }

        await Hive.initFlutter(storagePath);
      }

      // Register Adapters
      _registerAdapters();

      // Open Boxes concurrently for optimal startup performance
      await Future.wait([
        _openDecksBox(),
        _openWordsBox(),
        _openSettingsBox(),
      ]);

      _isInitialized = true;
      debugPrint('[DatabaseService] Hive initialized successfully. Decks: ${_decksBox?.length}, Words: ${_wordsBox?.length}');
    } catch (e, stackTrace) {
      debugPrint('[DatabaseService] Failed to initialize database: $e\n$stackTrace');
      throw DatabaseException(
        'Failed to initialize local Hive database.',
        code: 'HIVE_INIT_FAILED',
        originalError: e,
      );
    }
  }

  /// Registers all Hive TypeAdapters safely (preventing re-registration errors).
  void _registerAdapters() {
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(WordStatusAdapter());
    }
    if (!Hive.isAdapterRegistered(1)) {
      Hive.registerAdapter(WordModelAdapter());
    }
    if (!Hive.isAdapterRegistered(2)) {
      Hive.registerAdapter(DeckModelAdapter());
    }
  }

  Future<void> _openDecksBox() async {
    if (Hive.isBoxOpen(AppConstants.decksBoxName)) {
      _decksBox = Hive.box<DeckModel>(AppConstants.decksBoxName);
    } else {
      _decksBox = await Hive.openBox<DeckModel>(AppConstants.decksBoxName);
    }
  }

  Future<void> _openWordsBox() async {
    if (Hive.isBoxOpen(AppConstants.wordsBoxName)) {
      _wordsBox = Hive.box<WordModel>(AppConstants.wordsBoxName);
    } else {
      _wordsBox = await Hive.openBox<WordModel>(AppConstants.wordsBoxName);
    }
  }

  Future<void> _openSettingsBox() async {
    if (Hive.isBoxOpen(AppConstants.settingsBoxName)) {
      _settingsBox = Hive.box<dynamic>(AppConstants.settingsBoxName);
    } else {
      _settingsBox = await Hive.openBox<dynamic>(AppConstants.settingsBoxName);
    }
  }

  void _ensureInitialized() {
    if (!_isInitialized) {
      throw const DatabaseException(
        'DatabaseService must be initialized by calling init() before accessing boxes.',
        code: 'DB_NOT_INITIALIZED',
      );
    }
  }

  /// Compacts all open boxes to reclaim disk space.
  Future<void> compact() async {
    _ensureInitialized();
    await Future.wait([
      _decksBox?.compact() ?? Future.value(),
      _wordsBox?.compact() ?? Future.value(),
      _settingsBox?.compact() ?? Future.value(),
    ]);
  }

  /// Clears all data across all boxes (useful for testing or reset data feature).
  Future<void> clearAll() async {
    _ensureInitialized();
    await Future.wait([
      _decksBox?.clear() ?? Future.value(0),
      _wordsBox?.clear() ?? Future.value(0),
      _settingsBox?.clear() ?? Future.value(0),
    ]);
  }

  /// Closes all boxes and resets initialization state.
  Future<void> close() async {
    if (!_isInitialized) return;
    await Hive.close();
    _decksBox = null;
    _wordsBox = null;
    _settingsBox = null;
    _isInitialized = false;
    debugPrint('[DatabaseService] Database closed.');
  }
}
