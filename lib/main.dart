import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import 'core/constants/app_constants.dart';
import 'core/services/database_service.dart';
import 'core/themes/app_theme.dart';
import 'models/deck_model.dart';
import 'models/word_model.dart';
import 'models/word_status.dart';
import 'repositories/deck_repository.dart';
import 'repositories/word_repository.dart';
import 'ui/screens/deck_list_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive Database for Android, iOS, and Windows Desktop
  final db = DatabaseService.instance;
  await db.init();

  // Populate sample vocabulary deck if the database is newly created
  await _seedSampleDataIfEmpty();

  runApp(
    const ProviderScope(
      child: VocaFlowApp(),
    ),
  );
}

/// Populates a high-yield starter vocabulary deck on first launch.
Future<void> _seedSampleDataIfEmpty() async {
  final deckRepo = HiveDeckRepository();
  final wordRepo = HiveWordRepository();

  final deckCount = await deckRepo.getDeckCount();
  if (deckCount == 0) {
    const uuid = Uuid();
    final sampleDeckId = uuid.v4();

    final starterDeck = DeckModel(
      id: sampleDeckId,
      title: 'Oxford Essential Words',
      description: 'Bộ từ vựng tiếng Anh học thuật & giao tiếp thông dụng',
      colorCode: 0xFF4F46E5,
      createdAt: DateTime.now(),
    );

    await deckRepo.createDeck(starterDeck);

    final sampleWords = [
      WordModel(
        id: uuid.v4(),
        deckId: sampleDeckId,
        term: 'Ubiquitous',
        partOfSpeech: 'adjective',
        phonetic: '/juːˈbɪk.wə.təs/',
        definitionVi: 'Có mặt ở khắp mọi nơi cùng một lúc',
        exampleSentence: 'Smartphones have become ubiquitous in modern daily life.',
        note: 'Mẹo nhớ: U-bi (U ở khắp mọi nơi)',
        status: WordStatus.newWord,
        cefrLevel: 'C1',
        synonyms: ['omnipresent', 'pervasive', 'universal'],
        antonyms: ['rare', 'scarce', 'isolated'],
        collocations: ['ubiquitous presence', 'become ubiquitous'],
        createdAt: DateTime.now(),
      ),
      WordModel(
        id: uuid.v4(),
        deckId: sampleDeckId,
        term: 'Resilient',
        partOfSpeech: 'adjective',
        phonetic: '/rɪˈzɪl.jənt/',
        definitionVi: 'Kiên cường, có khả năng phục hồi nhanh chóng',
        exampleSentence: 'The local economy proved remarkably resilient during the crisis.',
        note: 'Dùng nhiều trong IELTS Writing Task 2',
        status: WordStatus.learning,
        cefrLevel: 'B2',
        synonyms: ['tough', 'flexible', 'adaptable', 'buoyant'],
        antonyms: ['fragile', 'vulnerable', 'weak'],
        collocations: ['resilient economy', 'highly resilient', 'resilient to shock'],
        createdAt: DateTime.now(),
      ),
      WordModel(
        id: uuid.v4(),
        deckId: sampleDeckId,
        term: 'Eloquent',
        partOfSpeech: 'adjective',
        phonetic: '/ˈel.ə.kwənt/',
        definitionVi: 'Hùng biện, có tài ăn nói lưu loát và truyền cảm',
        exampleSentence: 'She gave an eloquent speech that moved the entire audience.',
        note: 'Thường dùng miêu tả diễn giả hoặc bài viết',
        status: WordStatus.newWord,
        cefrLevel: 'C1',
        synonyms: ['articulate', 'expressive', 'fluent', 'persuasive'],
        antonyms: ['inarticulate', 'hesitant'],
        collocations: ['eloquent speaker', 'eloquent testimony', 'eloquent plea'],
        createdAt: DateTime.now(),
      ),
      WordModel(
        id: uuid.v4(),
        deckId: sampleDeckId,
        term: 'Pragmatic',
        partOfSpeech: 'adjective',
        phonetic: '/præɡˈmæt.ɪk/',
        definitionVi: 'Thực tế, coi trọng tính thực tiễn hơn lý thuyết',
        exampleSentence: 'We need to adopt a pragmatic approach to solve this engineering challenge.',
        note: 'Ngược nghĩa với idealistic',
        status: WordStatus.mastered,
        cefrLevel: 'C1',
        synonyms: ['practical', 'realistic', 'sensible', 'utilitarian'],
        antonyms: ['idealistic', 'impractical', 'visionary'],
        collocations: ['pragmatic approach', 'pragmatic solution', 'pragmatic policy'],
        createdAt: DateTime.now(),
      ),
      WordModel(
        id: uuid.v4(),
        deckId: sampleDeckId,
        term: 'Diligent',
        partOfSpeech: 'adjective',
        phonetic: '/ˈdɪl.ə.dʒənt/',
        definitionVi: 'Cần cù, chăm chỉ và chu đáo trong công việc',
        exampleSentence: 'Through diligent study and practice, he mastered the language.',
        note: 'Thường dùng trong đánh giá học sinh/nhân viên',
        status: WordStatus.learning,
        cefrLevel: 'B1',
        synonyms: ['hardworking', 'assiduous', 'meticulous', 'dedicated'],
        antonyms: ['lazy', 'careless', 'negligent'],
        collocations: ['diligent effort', 'diligent worker', 'diligent research'],
        createdAt: DateTime.now(),
      ),
    ];

    await wordRepo.createWordsBatch(sampleWords);
  }
}

/// Root widget of the VocaFlow application.
class VocaFlowApp extends StatelessWidget {
  const VocaFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system, // Responsive to OS dark/light mode
      home: const DeckListScreen(),
    );
  }
}
