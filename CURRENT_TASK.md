# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-63 (Build 295)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-63 Build 295)

- [x] **Khắc Phục Lỗi Giảm Trừ & Xóa Bỏ Từ Trong Sổ Tay Lỗi Sai (Mistake Notebook Decrement & Sync Fix)**:
  - Sửa đổi cơ chế đồng bộ Cloud `mergeCloudDataIntoLocal`, không cho phép kéo dữ liệu cũ từ Cloud về đè hoặc hồi sinh (`Math.max`) các từ đã được giảm trừ số lần sai hoặc đã giải quyết xong (xóa bỏ khỏi sổ tay).
  - Tự động kích hoạt đồng bộ nền đẩy lên Cloud `pushCurrentDatabaseToCloud()` ngay lập tức mỗi khi danh sách lỗi sai được cập nhật tại chỗ.

- [x] **Chặn Mở Sổ Tay Lỗi Sai Khi Đang Trong Chế Độ Học Bất Kỳ**:
  - Không cho phép người dùng mở `#modal-mistake-notebook` khi đang ở màn hình học chủ động (`screen-quiz`, `screen-spelling`, `screen-speaking`, `screen-autofc`).
  - Làm mờ nút sổ tay trên Header (`opacity: 0.4`, không khả dụng) và hiển thị thông báo toast: "⚠️ Không thể mở Sổ tay lỗi sai khi đang trong chế độ học!".

- [x] **Tái Cấu Trúc Không Gian Cộng Đồng & Ra Mắt Trung Tâm Cộng Đồng (Community Center)**:
  - Tách triệt để "Đang theo dõi", "Khám phá" và "Thành tích" ra khỏi `ME/COMMUNITY` (`modal-profile`). Tab `ME/COMMUNITY` chỉ hiển thị duy nhất các bài viết do chính chủ tài khoản đăng tải (`post.authorUid === myUid`).
  - Trang cá nhân công khai `@<username>/COMMUNITY` chỉ hiển thị duy nhất các bài viết do chính tác giả `@<username>` đăng tải.
  - Tạo mới hoàn toàn modal Trung Tâm Cộng Đồng `modal-community-center.html` (`COMMUNITYCENTER`), tích hợp vào menu 3 chấm trên Header và route SPA `/communitycenter`.
  - Trung Tâm Cộng Đồng hiển thị toàn bộ bài viết của chính mình + những người mình đang theo dõi (`post.authorUid === myUid || myFollowingMap[post.authorUid]`) với 5 bộ lọc pill: `"Tất cả"` (`all`), `"Đang theo dõi"` (`following`), `"Của tôi"` (`my`), `"Chứa ảnh"` (`has_image`), `"Thành tích"` (`achievement`).

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.9-63 Build 295)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-63 (Build 295)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-63 (Build 295)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-63 (Build 295)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-63 Build 295`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-63'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-63 (Build 295)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.9-63`)
  - `pubspec.yaml` (`version: 0.10.9+295`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-63`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-63_Windows_Portable.zip`, commit `v0.10.9-63 (Build 295)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-63 (Build 295)`)