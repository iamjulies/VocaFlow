# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-6 (Build 307)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** ✅ **HOÀN TẤT KIỂM THỬ CDP & ĐÃ XUẤT BẢN ĐA NỀN TẢNG (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-6 Build 307)

- [x] **Nâng Cấp Thuật Toán Lặp Lại Ngắt Quãng SRS Chuẩn SuperMemo-2 / Ebbinghaus (04-decks-manager.js & 07-speaking-engine.js)**:
  - Chuyển đổi từ 5 mốc phân loại cứng sơ sài sang thuật toán Spaced Repetition System (SRS) SM-2 chuẩn hóa.
  - Tính toán chu kỳ giãn cách động (`srsInterval`) dựa trên Hệ số dễ (`srsEaseFactor`), Số lần lặp lại liên tiếp (`srsRepetition`) và độ quên lãng Ebbinghaus.
  - Cung cấp các hàm nòng cốt `calculateSm2Review(word, rating)` và `applySm2RatingToWord(word, rating)` tự động co giãn chu kỳ ngày ôn tập chính xác cho từng từ vựng.
  - Cập nhật `getReviewIntervalDays(word)` và `getDueReviewWords()` hỗ trợ ưu tiên mốc thời gian `srsNextReview` chính xác đến từng mili-giây.
  - Thêm thanh đánh giá 3 mức độ nhớ nhanh trong chế độ Auto Flashcard (`screen-autofc.html`): `[1] Chưa Rõ` (1 ngày), `[2] Mang Máng` (3-5 ngày), `[3] Nhớ Rồi` (SM-2).
  - Hỗ trợ phím tắt siêu tốc `1`, `2`, `3` trên bàn phím (`app.js`).
  - Cơ chế nghe thụ động trung tính: Khi người dùng để Auto Flashcard chạy tự động mà không nhấn đánh giá, hệ thống vẫn chuyển thẻ mượt mà mà không phạt điểm hay phá vỡ chu kỳ ôn tập.

- [x] **VocaMentor AI Trí Nhớ Dài Hạn & Hồ Sơ Năng Lực Học Viên (09-ai-mentor.js & 07-speaking-engine.js)**:
  - Hồ sơ năng lực học viên (Learner Profile Context):
    - Tự động tổng hợp và truyền ngữ cảnh dài hạn cho AI qua `getLearnerProfileContext()`: Tên học viên, chuỗi ngày học Streak, các từ vựng đang gặp khó khăn (điểm ghi nhớ thấp < 60%), các từ trọng tâm được đánh dấu sao ⭐.
    - Tích hợp cơ chế ghi nhận lỗi phát âm âm vị `recordSpeakingWeakPhonemes()` (ví dụ hay nuốt ending sound /s/, /t/, /d/, lệch trọng âm, âm bồi) từ phòng Speaking Lab vào trí nhớ để AI Mentor nhắc nhở và thiết kế bài tập cá nhân hóa.
    - Nạp ngữ cảnh hồ sơ năng lực trực tiếp vào `systemInstruction` của Gemini AI trong `handleSendAiChatMessage()`.
  - Tính năng "Trò chuyện với Bộ từ" (`deck_story`):
    - Bổ sung Chip hành động nhanh `📖 Viết truyện từ vựng` / `📖 Kể chuyện với từ khó` trong mọi ngữ cảnh học (Thẻ từ, VocaDeck, Tự do).
    - Khi nhấn chip, AI tự động lấy 5-8 từ vựng yếu / đánh dấu sao trong bộ từ hiện tại và khởi tạo prompt yêu cầu VocaMentor AI viết một mẩu truyện/bài báo sinh động, in đậm từ vựng và đặt câu hỏi đọc hiểu tương tác.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-6 Build 307)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-6 (Build 307)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-6 (Build 307)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-6 (Build 307)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-6 Build 307`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-6'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-6 (Build 307)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` & `GITHUB_RELEASE/VocaFlow_Windows_App/sw.js` (`vocaflow-pwa-v0.10.10-6`)
  - `pubspec.yaml` (`version: 0.10.10+307`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-6`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-6_Windows_Portable.zip`, commit `feat: Release v0.10.10-6 (Build 307)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-6 (Build 307)`)