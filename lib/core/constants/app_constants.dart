/// Global constants for VocaFlow application
class AppConstants {
  AppConstants._();

  static const String appName = 'VocaFlow';
  static const String appVersion = 'v0.0.1';

  // Hive Box Names
  static const String decksBoxName = 'vocaflow_decks_box';
  static const String wordsBoxName = 'vocaflow_words_box';
  static const String settingsBoxName = 'vocaflow_settings_box';

  // Default Palette Colors for Decks (Hex Values)
  static const List<int> defaultDeckColors = [
    0xFF4F46E5, // Indigo
    0xFF06B6D4, // Cyan
    0xFF10B981, // Emerald
    0xFFF59E0B, // Amber
    0xFFEF4444, // Rose Red
    0xFF8B5CF6, // Purple
    0xFFEC4899, // Pink
    0xFF3B82F6, // Blue
  ];

  // Common Parts of Speech
  static const List<String> partsOfSpeech = [
    'noun',
    'verb',
    'adjective',
    'adverb',
    'phrase',
    'idiom',
    'preposition',
    'conjunction',
    'interjection',
  ];
}
