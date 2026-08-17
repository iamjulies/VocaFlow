import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';

/// Playback state for tracking active TTS operations in the UI.
class TtsPlaybackState {
  final String? activeTerm;
  final bool isLoading;
  final bool isPlaying;
  final String? errorMessage;

  const TtsPlaybackState({
    this.activeTerm,
    this.isLoading = false,
    this.isPlaying = false,
    this.errorMessage,
  });

  bool isTermActive(String term) =>
      activeTerm?.trim().toLowerCase() == term.trim().toLowerCase();

  TtsPlaybackState copyWith({
    String? activeTerm,
    bool? isLoading,
    bool? isPlaying,
    String? errorMessage,
    bool clearActive = false,
  }) {
    return TtsPlaybackState(
      activeTerm: clearActive ? null : (activeTerm ?? this.activeTerm),
      isLoading: isLoading ?? this.isLoading,
      isPlaying: isPlaying ?? this.isPlaying,
      errorMessage: errorMessage,
    );
  }

  static const idle = TtsPlaybackState();
}

/// Natural Text-To-Speech Service utilizing Google Natural Audio Streaming with offline local caching.
class TtsService extends ChangeNotifier {
  final AudioPlayer _audioPlayer;
  Directory? _cacheDir;
  TtsPlaybackState _state = TtsPlaybackState.idle;

  TtsPlaybackState get state => _state;
  bool get isPlaying => _state.isPlaying;
  bool get isLoading => _state.isLoading;
  String? get activeTerm => _state.activeTerm;

  TtsService({AudioPlayer? audioPlayer})
      : _audioPlayer = audioPlayer ?? AudioPlayer() {
    _initPlayerListeners();
  }

  void _initPlayerListeners() {
    _audioPlayer.playerStateStream.listen((playerState) {
      final isPlaying = playerState.playing &&
          playerState.processingState != ProcessingState.completed;

      if (playerState.processingState == ProcessingState.completed) {
        _state = TtsPlaybackState.idle;
        notifyListeners();
      } else if (_state.isPlaying != isPlaying) {
        _state = _state.copyWith(isPlaying: isPlaying);
        notifyListeners();
      }
    }, onError: (Object err) {
      debugPrint('TtsService AudioPlayer stream error: $err');
      _state = _state.copyWith(
        isLoading: false,
        isPlaying: false,
        errorMessage: err.toString(),
        clearActive: true,
      );
      notifyListeners();
    });
  }

  /// Sanitizes text for safe filesystem caching filenames.
  String _sanitizeFilename(String text) {
    return text
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9_-]'), '_')
        .replaceAll(RegExp(r'_+'), '_');
  }

  /// Obtains the dedicated audio cache directory (`{cache_dir}/audio/`).
  Future<Directory> _getAudioCacheDirectory() async {
    if (_cacheDir != null && await _cacheDir!.exists()) {
      return _cacheDir!;
    }
    final appDir = await getApplicationDocumentsDirectory();
    final audioDir = Directory('${appDir.path}/audio');
    if (!await audioDir.exists()) {
      await audioDir.create(recursive: true);
    }
    _cacheDir = audioDir;
    return audioDir;
  }

  /// Generates the Google Natural TTS endpoint URL for US or UK accent.
  String getEndpointUrl(String text, {String accent = 'en-US'}) {
    final encoded = Uri.encodeComponent(text.trim());
    final lang = (accent.toLowerCase() == 'en-gb' || accent.toLowerCase() == 'uk')
        ? 'en-GB'
        : 'en-US';
    return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=$lang&q=$encoded';
  }

  /// Streams and speaks the given vocabulary term with natural pronunciation.
  ///
  /// Workflow:
  /// 1. Checks if `{cache_dir}/audio/{accent}_{sanitized_word}.mp3` exists.
  /// 2. If present, plays directly from local storage.
  /// 3. If not present, downloads the byte stream from Google TTS, caches to disk, then plays.
  Future<void> speak(String text, {String accent = 'en-US'}) async {
    final cleanText = text.trim();
    if (cleanText.isEmpty) return;

    try {
      // 1. Update UI state to loading
      _state = TtsPlaybackState(
        activeTerm: cleanText,
        isLoading: true,
        isPlaying: false,
      );
      notifyListeners();

      // 2. Stop any current playback
      await _audioPlayer.stop();

      // 3. Resolve local cache path
      final cacheDir = await _getAudioCacheDirectory();
      final normAccent = (accent.toLowerCase() == 'en-gb' || accent.toLowerCase() == 'uk')
          ? 'en-GB'
          : 'en-US';
      final sanitized = _sanitizeFilename(cleanText);
      final cacheFile = File('${cacheDir.path}/${normAccent}_$sanitized.mp3');

      // 4. Check offline cache
      if (await cacheFile.exists() && (await cacheFile.length()) > 0) {
        debugPrint('TtsService: Playing cached audio for "$cleanText" at ${cacheFile.path}');
        await _audioPlayer.setFilePath(cacheFile.path);
      } else {
        // 5. Download and cache byte stream from Google TTS
        final url = getEndpointUrl(cleanText, accent: normAccent);
        debugPrint('TtsService: Downloading natural TTS stream from $url');

        final response = await http.get(
          Uri.parse(url),
          headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        );

        if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
          await cacheFile.writeAsBytes(response.bodyBytes, flush: true);
          await _audioPlayer.setFilePath(cacheFile.path);
        } else {
          // Fallback: try streaming directly via URL if writing failed
          debugPrint('TtsService: Direct stream fallback (status: ${response.statusCode})');
          await _audioPlayer.setUrl(url);
        }
      }

      // 6. Play audio
      _state = _state.copyWith(isLoading: false, isPlaying: true);
      notifyListeners();
      await _audioPlayer.play();
    } catch (e) {
      debugPrint('TtsService speak error: $e');
      _state = TtsPlaybackState.idle.copyWith(errorMessage: e.toString());
      notifyListeners();
    }
  }

  /// Stops current speech playback immediately.
  Future<void> stop() async {
    try {
      await _audioPlayer.stop();
      _state = TtsPlaybackState.idle;
      notifyListeners();
    } catch (e) {
      debugPrint('TtsService stop error: $e');
    }
  }

  /// Cleanly disposes audio resources to avoid memory leaks.
  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }
}

/// Riverpod provider for accessing TtsService across the application.
final ttsServiceProvider = ChangeNotifierProvider<TtsService>((ref) {
  final service = TtsService();
  ref.onDispose(() => service.dispose());
  return service;
});
