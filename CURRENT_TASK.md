# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-14 (Build 315)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-14 Build 315)

- [x] **Vấn đề 24 (Quản lý Sửa/Xóa Bình Luận & Bia Mộ Tombstone Bảo Toàn Dữ Liệu)**:
  - Bổ sung nút ✏️ Chỉnh sửa và 🗑️ Xóa cho bình luận của chính người dùng (`c.authorUid === myUid`).
  - Khi xóa bình luận cha, hệ thống đánh dấu `isDeleted = true`, chuyển nội dung sang `🪦 [Bình luận này đã bị xóa]` giúp chuỗi phản hồi cấp con bên dưới không bị đứt đoạn hay biến mất.

- [x] **Vấn đề 25 (Trạng Thái Hoạt Động & Thời Gian Online Gần Nhất Trong Hồ Sơ Cá Nhân)**:
  - Thêm chấm xanh phát sáng (`🟢`) trên avatar và dòng trạng thái `🟢 Đang hoạt động` / `⚪ Hoạt động X phút/giờ/ngày trước` (làm tròn chuẩn xác phong cách Facebook) trong `modal-public-profile.html`.
  - Tích hợp `heartbeatUserOnlineStatus()` định kỳ cập nhật `lastActiveAt`.

- [x] **Vấn đề 26 (Khắc Phục Lỗi Reset Thời Gian Bài Đăng @official Về "Vừa Xong")**:
  - Chuẩn hóa mốc thời gian phát hành cố định `VOCAFLOW_OFFICIAL_RELEASE_TIME = '2026-09-14T18:00:00.000Z'`.
  - Kiểm tra dữ liệu bài viết đã tồn tại trên Cloud/Local trước khi seed, không bao giờ ghi đè timestamp và bảo toàn 100% số lượt thích và bình luận.

- [x] **Vấn đề 27 (Hệ Thống Bình Luận Phân Cấp & Tag Mention @ Thông Minh)**:
  - **27a**: Phân cấp cây bình luận trực quan với phản hồi (`reply`) được thụt lề 26px sang phải kèm thanh nối dọc (`border-left: 2px solid rgba(99,102,241,0.3)`).
  - **27b**: Sửa triệt để lỗi lặp `@username @username` khi trả lời bình luận; dọn dẹp handle thừa khi gửi.
  - **27c**: Tự động chuyển đổi mọi `@username` trong bài viết và bình luận thành liên kết mở hồ sơ cá nhân; gợi ý tự động (Autocomplete) khi gõ `@` hỗ trợ `@followers` (thông báo đến toàn bộ người theo dõi), `@official` và bạn bè/người đang theo dõi.
  - **27d**: Thông báo Realtime tức thì: Bắn thông báo tương tác ngay lập tức không cần F5 tải lại trang, đồng bộ đa tab qua `BroadcastChannel` và poller nền 12s.

- [x] **Đồng Bộ Toàn Diện Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-14 Build 315)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-14 (Build 315)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-14 (Build 315)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-14 (Build 315)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-14 Build 315`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-14'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-14 (Build 315)'`)
  - `src/scripts/modules/03-auth.js` (`VOCAFLOW_OFFICIAL_VERSION_KEY = 'v0.10.10-14'`)
  - `src/scripts/modules/06c-writing-engine.js` (`v0.10.10-14 Build 315`)
  - `src/scripts/modules/07-speaking-engine.js` (`v0.10.10-14 Build 315`)
  - `src/scripts/modules/08-wallet-economy.js` (`v0.10.10-14 Build 315`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-14`)
  - `pubspec.yaml` (`version: 0.10.10+315`)
  - `VocaFlow_Desktop/Program.cs` (`v0.10.10-14`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-14 (Build 315)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`