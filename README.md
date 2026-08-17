# VocaFlow (v0.0.1) - Offline-First Vocabulary Learning App

> VocaFlow là ứng dụng học từ vựng tiếng Anh cá nhân hóa đa nền tảng (Android, iOS, Windows Desktop), hoạt động offline 100% với kiến trúc Clean Architecture & Riverpod.

---

## 📁 Cấu Trúc Thư Mục (Clean Architecture & Feature-Ready)

```text
lib/
├── core/
│   ├── constants/
│   │   └── app_constants.dart       # Tên Box Hive, bảng màu sắc mặc định, danh sách từ loại
│   ├── errors/
│   │   └── app_exception.dart       # Custom Exceptions (DatabaseException, NotFoundException)
│   ├── services/
│   │   └── database_service.dart    # Khởi tạo & quản lý lifecycle Hive Boxes (Windows/iOS/Android)
│   └── themes/                      # Theme Dark/Light Material 3 (giai đoạn UI)
├── models/
│   ├── word_status.dart             # Enum WordStatus (new | learning | mastered)
│   ├── word_status.g.dart           # TypeAdapter cho WordStatus
│   ├── word_model.dart              # Model WordModel (id, deckId, term, partOfSpeech, phonetic, ...)
│   ├── word_model.g.dart            # TypeAdapter cho WordModel
│   ├── deck_model.dart              # Model DeckModel (id, title, description, colorCode, ...)
│   └── deck_model.g.dart            # TypeAdapter cho DeckModel
├── repositories/                    # Repository Interfaces & Implementations (Task tiếp theo)
├── state/                           # Riverpod Notifiers & State Providers (Task tiếp theo)
└── ui/                              # Screens & Reusable Widgets (Flashcard, Quiz, Deck List)
```

---

## 📦 Data Schema v0.0.1

### 1. `WordModel` (`@HiveType(typeId: 1)`)
| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Khóa chính duy nhất, sẵn sàng sync Cloud |
| `deckId` | `String` (UUID) | Khóa ngoại liên kết tới Bộ từ (Deck) |
| `term` | `String` | Từ vựng tiếng Anh |
| `partOfSpeech` | `String` | Từ loại (noun, verb, adjective...) |
| `phonetic` | `String` | Phiên âm IPA chuẩn (ví dụ: `/ˈbɪk.wə.təs/`) |
| `definitionVi` | `String` | Định nghĩa tiếng Việt súc tích |
| `exampleSentence` | `String?` | Câu ví dụ ngữ cảnh (sẵn sàng nạp AI Writer) |
| `note` | `String?` | Ghi chú cá nhân của người học |
| `status` | `WordStatus` (Enum) | Trạng thái: `newWord` ('new') \| `learning` \| `mastered` |
| `createdAt` | `DateTime` | Thời gian tạo |
| `updatedAt` | `DateTime?` | Thời gian cập nhật gần nhất |

### 2. `DeckModel` (`@HiveType(typeId: 2)`)
| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Khóa chính của bộ từ |
| `title` | `String` | Tên bộ từ (VD: "Oxford 3000", "IELTS Academic") |
| `description` | `String` | Mô tả ngắn bộ từ |
| `colorCode` | `int` | Mã màu HEX để hiển thị UI |
| `createdAt` | `DateTime` | Thời gian tạo |
| `updatedAt` | `DateTime?` | Thời gian cập nhật |

---

## 🚀 Khởi Tạo Database Service

```dart
import 'package:vocaflow/core/services/database_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Khởi tạo Hive tự động tương thích Windows, iOS, Android
  await DatabaseService.instance.init();
  
  runApp(const ProviderScope(child: VocaFlowApp()));
}
```
