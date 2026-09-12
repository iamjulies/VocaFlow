# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-57 (Build 289)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-57 Build 289)

- [x] **Tối Ưu Hóa Toàn Diện Kiến Trúc Gemini Model 2 Tầng (Two-Tier Gemini Architecture)**:
  - **Deep / Reasoning / Multimodal Tier** (`GEMINI_MODELS_DEEP`): `vocamentor ai`, `vocadeck ai`, `vocaspeaking ai`. Danh sách: `gemini-2.0-flash` (chính), `gemini-2.0-flash-001`, `gemini-1.5-flash`, `gemini-1.5-pro`. Loại bỏ hoàn toàn các model chậm và không tương thích như `gemini-3.8-flash`.
  - **Ultra-Fast / Micro-Task Tier** (`GEMINI_MODELS_FAST`): `vocafill ai` (tự động điền từ vựng), `vocahint ai` (gợi ý ngữ cảnh câu hỏi quiz), `vocaoption ai` (sinh 3 đáp án nhiễu chameleon), `vocacomment ai` (sinh mẹo nhớ & giải thích từ nguyên học trong quiz/spelling). Danh sách: `gemini-2.0-flash-lite`, `gemini-2.0-flash-lite-preview-02-05`, `gemini-1.5-flash-8b`, fallback `gemini-2.0-flash`, `gemini-1.5-flash`. Phản hồi sub-second (< 1s).

- [x] **Khắc Phục & Giải Trình Triệt Để Lỗi 404 NotFound & 403 Forbidden Trong Google AI Studio**:
  - **88 lỗi 404**: Do các hàm gọi API lặp qua các chuỗi tên model thử nghiệm/lỗi thời không tồn tại trên endpoint `v1beta/models/{m}:generateContent` và dính cache cũ trong `localStorage`.
  - **Giải pháp**: Xây dựng hàm `purgeInvalidGeminiModelCache()`, dọn dẹp cache hỏng khi khởi động, lưu working model theo từng tier (`deep` vs `fast`), chỉ gửi request tới các model chuẩn được Google AI Studio hỗ trợ chính thức.
  - **3 lỗi 403**: Do khóa API chưa kích hoạt hoặc bị giới hạn, hệ thống tự động phát hiện và cảnh báo trực quan cho người dùng.

- [x] **Xoay Vòng Đa Khóa Tự Động (Multi-Key Pool Rotation) & Tăng Cường VocaFill / VocaComment**:
  - Tích hợp xoay vòng thông minh qua toàn bộ 3 khóa trong kho VocaVIP (`getStoredApiKeys()`), đảm bảo tính dự phòng 100% khi một khóa gặp hạn mức (Rate Limit) hoặc lỗi kết nối.
  - Khắc phục triệt để lỗi VocaFill AI (`handleAiGenerateWord`) và VocaComment AI trong `06-spelling-engine.js` và `05-quiz-engine.js`.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-57 Build 289)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-57 (Build 289)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-57 (Build 289)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-57 (Build 289)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-57 Build 289`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-57'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-57 (Build 289)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-57`)
  - `pubspec.yaml` (`version: 0.10.9+289`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-57`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-57_Windows_Portable.zip`, commit `v0.10.9-57 (Build 289)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-57 (Build 289)`)