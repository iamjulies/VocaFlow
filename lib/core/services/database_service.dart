import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';

import '../constants/app_constants.dart';
import '../errors/app_exception.dart';
import '../../firebase_options.dart';
import '../../models/deck_model.dart';
import '../../models/word_model.dart';
import '../../models/word_status.dart';

/// Core Database & Persistence Service managing Hive local storage and Firebase Cloud initialization.
///
/// Multi-Platform support: Android, iOS, Windows Desktop, macOS, Linux, and Web.
/// Implements an Offline-First architecture: Hive is always primary and guaranteed to work,
/// with Firebase seamlessly activating whenever network and credentials are present.
class DatabaseService {
  DatabaseService._internal();

  static final DatabaseService _instance = DatabaseService._internal();
  static DatabaseService get instance => _instance;

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  bool _isFirebaseAvailable = false;
  bool get isFirebaseAvailable => _isFirebaseAvailable;

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

  /// Initializes Hive local database and safely initializes Firebase across all platforms.
  ///
  /// [subDir]: Optional custom subdirectory for Hive storage.
  Future<void> init({String? subDir}) async {
    if (_isInitialized) {
      debugPrint('[DatabaseService] Database is already initialized.');
      return;
    }

    try {
      debugPrint('[DatabaseService] Initializing Local Hive Database for platform: ${defaultTargetPlatform.name}...');
      
      // 1. Initialize Hive with Platform-Specific Paths
      if (kIsWeb) {
        await Hive.initFlutter();
      } else {
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

      // 2. Register Type Adapters
      _registerAdapters();

      // 3. Open Local Hive Boxes Concurrently
      await Future.wait([
        _openDecksBox(),
        _openWordsBox(),
        _openSettingsBox(),
      ]);

      // 4. Safe Cross-Platform Firebase Initialization
      await _initFirebase();

      _isInitialized = true;
      debugPrint('[DatabaseService] Database initialized successfully (Decks: ${_decksBox?.length}, Words: ${_wordsBox?.length}, Firebase Available: $_isFirebaseAvailable).');
    } catch (e, stackTrace) {
      debugPrint('[DatabaseService] Failed to initialize database: $e\n$stackTrace');
      throw DatabaseException(
        'Failed to initialize local Hive database.',
        code: 'HIVE_INIT_FAILED',
        originalError: e,
      );
    }
  }

  /// Safely attempts to initialize Firebase without halting the offline-first app on desktop/fallback.
  Future<void> _initFirebase() async {
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      _isFirebaseAvailable = true;
      debugPrint('[DatabaseService] Firebase Cloud Core initialized successfully for project: ${DefaultFirebaseOptions.currentPlatform.projectId}');
    } catch (e) {
      _isFirebaseAvailable = false;
      debugPrint('[DatabaseService] Firebase initialization skipped or running offline/fallback: $e');
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
    _isFirebaseAvailable = false;
    debugPrint('[DatabaseService] Database closed.');
  }
}

/// Global Riverpod Provider for [DatabaseService].
final databaseServiceProvider = Provider<DatabaseService>((ref) {
  return DatabaseService.instance;
});
