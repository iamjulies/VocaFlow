# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-3 (Build 304)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH BUILD & KIỂM THỬ CDP**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-3 Build 304)

- [x] **Khắc Phục Lỗi Quét Toàn Bộ DB /users.json Trong initGlobalVipRegistry (12-achievements.js)**:
  - Xóa bỏ hoàn toàn lệnh fetch(`${firebaseConfig.databaseURL}/users.json`) tải toàn bộ DB khi khởi động.
  - Thay thế bằng endpoint chỉ mục VIP siêu nhẹ `${firebaseConfig.databaseURL}/vip_users_index.json`.
  - Tự động đồng bộ mục này trong `pushCurrentDatabaseToCloud` khi người dùng VIP lưu dữ liệu.
  - Bổ sung hàm `registerAuthorToVipRegistry(authorObj)` giúp nạp và lưu cache động thông tin tác giả khi tải bài viết/bộ từ.

- [x] **Khắc Phục Lỗi Tràn Bộ Nhớ LocalStorage QuotaExceededError Do Ảnh AI Mentor (09-ai-mentor.js & 02-state-core.js)**:
  - Xóa bỏ cơ chế lưu đúp dữ liệu lịch sử chat (Double Storage) vào cả 2 key.
  - Xây dựng hàm `sanitizeAiChatHistoryForLocal(history, limit = 20)` loại bỏ chuỗi Base64 và data URIs nặng trước khi lưu vào localStorage.
  - Bổ sung cơ chế bảo vệ phân tầng: tự động cắt tỉa lịch sử về 8 tin nhắn gần nhất nếu bắt gặp `QuotaExceededError`.
  - Cập nhật hàm `renderAiChatMessages` hiển thị chip ảnh thông minh khi ảnh đã được dọn dẹp nhị phân.
  - Đồng bộ `sanitizeAiChatHistoryForCloud` để loại bỏ toàn bộ dữ liệu ảnh nặng trước khi gửi lên Cloud RTDB.

- [x] **Bổ Sung Asset icons/flow.png Vào Service Worker Cache PWA (sw.js)**:
  - Bổ sung `'./icons/flow.png'` vào danh sách `ASSETS` của tất cả các file `sw.js`.
  - Cập nhật cache name lên `vocaflow-pwa-v0.10.10-3`.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-3 Build 304)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-3 (Build 304)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-3 (Build 304)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-3 (Build 304)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-3 Build 304`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-3'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-3 (Build 304)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-3`)
  - `pubspec.yaml` (`version: 0.10.10+304`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-3`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-3_Windows_Portable.zip`, commit `feat: Release v0.10.10-3 (Build 304)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-3 (Build 304)`)