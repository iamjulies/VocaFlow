# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-64 (Build 296)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-64 Build 296)

- [x] **Tự Động Giảm & Xóa Lỗi Sai Khi Thoát Sớm Mọi Chế Độ Học (Early Exit Mistake Decrement & Removal)**:
  - Bổ sung cơ chế tự động ghi nhận học từ vựng khi người dùng thoát ngang chừng (ở bất kỳ mode nào: Trắc nghiệm, Luyện viết, Luyện nói, Flashcard rảnh tay).
  - Mọi từ vựng đã được học/ôn tập trong phiên thoát sớm đều được tính là đã học => giảm trừ 1 lần làm sai nếu nằm trong Sổ Tay Lỗi Sai; khi số lần sai <= 0 thì tự động loại bỏ khỏi sổ tay.
  - Luôn tự động lưu trữ cục bộ `saveDatabase(true)` và đồng bộ tức thì lên đám mây `pushCurrentDatabaseToCloud()` khi thoát.

- [x] **Đồng Bộ 2 Chiều Chống Hồi Sinh Đang Theo Dõi & Người Theo Dõi (Anti-Resurrection Following/Followers Sync)**:
  - Khắc phục triệt để lỗi khi người dùng hủy theo dõi tác giả A thì sau khi đồng bộ Cloud tác giả A bị hồi sinh trở lại danh sách đang theo dõi.
  - Triển khai tập bia mộ `unfollowedUserUids` (lưu trữ tại `vocaflow_unfollowed_uids` và đồng bộ lên Cloud) để lọc sạch các creator đã hủy theo dõi khỏi mọi tiến trình merge Cloud.
  - Với danh sách người theo dõi (`followers`), sử dụng Cloud làm nguồn chân lý duy nhất (authoritative source of truth).

- [x] **Đồng Bộ 2 Chiều Sổ Tay Lỗi Sai Kháng Zombie (Anti-Zombie Mistake Notebook 2-Way Sync)**:
  - Triển khai tập bia mộ `deletedMistakeWordKeys` (lưu trữ tại `vocaflow_deleted_mistakes` và đồng bộ lên Cloud) ghi nhận cả `wordId` và `term` của các từ đã khắc phục xong hoặc xóa bỏ.
  - Loại trừ hoàn toàn nguy cơ các từ lỗi sai đã hoàn thành bị tải về và hồi sinh trở lại qua các lần sync dữ liệu giữa các thiết bị.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.9-64 Build 296)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-64 (Build 296)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-64 (Build 296)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-64 (Build 296)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-64 Build 296`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-64'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-64 (Build 296)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.9-64`)
  - `pubspec.yaml` (`version: 0.10.9+296`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-64`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-64_Windows_Portable.zip`, commit `v0.10.9-64 (Build 296)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-64 (Build 296)`)