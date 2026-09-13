# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-65 (Build 297)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-65 Build 297)

- [x] **Học Đến Đâu Xóa Đến Đấy - Real-Time Per-Word Mistake Removal & Instant Cloud Sync**:
  - Khắc phục triệt để lỗi từ sai không được xóa ra khỏi Sổ Tay Lỗi Sai trong quá trình học.
  - Cơ chế mới: "Học đến đâu là xóa từ đến đấy (được từ nào là đồng bộ ngay đến đấy)".
  - Auto Flashcard: Ngay khi từng thẻ bài được hiển thị/đọc/lật hoặc chuyển qua (`renderAutoCardOnly`, `runAutoFlashcardLoop`, `nextAutoFlashcard`, `prevAutoFlashcard`), hệ thống lập tức giảm trừ/xóa từ khỏi Sổ Tay Lỗi Sai và đồng bộ ngay lập tức lên Cloud.
  - Quiz Mode: Ngay khi trả lời đúng một câu hỏi, lập tức trừ số lần sai hoặc loại bỏ từ khỏi sổ tay và đẩy dữ liệu lên Cloud tức thì (`saveDatabase(true)`, `pushCurrentDatabaseToCloud()`).
  - Spelling Mode: Ngay khi gõ đúng từ ở chế độ Extreme hoặc Letter Boxes, lập tức trừ số lần sai/xóa từ và đồng bộ đám mây ngay lập tức.
  - Speaking Mode: Ngay khi phát âm đạt điểm sàn, lập tức trừ số lần sai/xóa từ và đồng bộ đám mây ngay lập tức.

- [x] **Cải Tiến Khớp Từ Đa Mã Định Danh (Robust Multi-Identifier Matching & Tombstone Architecture)**:
  - Hỗ trợ chuẩn hóa và so khớp đa chiều: `id`, `wordId`, `term` (loại bỏ dấu câu, khoảng trắng thừa, chuẩn hóa chữ thường).
  - Tự động làm sạch mọi bản ghi trùng lặp (`duplicate entries`) trong danh sách lỗi sai khi từ được khắc phục.
  - Ghi nhận đầy đủ tombstone vào `deletedMistakeWordKeys` để chống hồi sinh dữ liệu khi đồng bộ đa thiết bị.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.9-65 Build 297)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-65 (Build 297)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-65 (Build 297)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-65 (Build 297)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-65 Build 297`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-65'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-65 (Build 297)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.9-65`)
  - `pubspec.yaml` (`version: 0.10.9+297`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-65`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-65_Windows_Portable.zip`, commit `v0.10.9-65 (Build 297)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-65 (Build 297)`)