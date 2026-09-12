# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-59 (Build 291)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-59 Build 291)

- [x] **Đồng Bộ Display Name Thời Gian Thực Giữa ME & Community Feed**:
  - Khắc phục triệt để lỗi Community Feed hiển thị tên cũ bị đóng băng tại thời điểm đăng bài (ví dụ `sếch-xi bích`) thay vì biệt danh mới cập nhật trong trang ME (ví dụ `clgt?`).
  - Xây dựng các hàm phân giải thông tin tác giả động trong `03-auth.js`: `getCommunityAuthorName`, `getCommunityAuthorHandle`, `getCommunityAuthorIsVip`, `getCommunityCommentAuthorName`, `getCommunityCommentAuthorHandle`.
  - Tự động kiểm tra `post.authorUid === currentUser.uid` để luôn lấy `currentUser.displayName` mới nhất cho cả bài viết lẫn bình luận trong `renderCommunityFeed` và `renderPubProfileCommunityPosts`.

- [x] **Thống Kê Hiệu Suất 7 Ngày 2 Chiều & Thời Gian Học Thực Tế 4 Chế Độ**:
  - Thay thế thời gian mở màn hình thụ động bằng tổng thời gian học thực tế được tích lũy chuẩn xác từ 4 chế độ học: Flashcard (lướt thẻ), Quiz (Trắc nghiệm), Spelling (Luyện viết), Speaking (Luyện nói).
  - Tích hợp `addDailyStudySeconds(seconds, mode)` và `getDailyStudyTimeMap()` trong `02-state-core.js` với cơ chế đồng bộ 2 chiều (2-way sync) lên Firebase Realtime Database (`users/{uid}/dailyStudyTime/{YYYY-MM-DD}`).
  - Ghi nhận thời gian học khi kết thúc phiên hoặc thoát giữa chừng trong `05-quiz-engine.js`, `06-spelling-engine.js`, `07-speaking-engine.js`.
  - Cập nhật biểu đồ 7 ngày `render7DayPerformanceChart` và các thẻ thống kê tổng quan với dữ liệu thật từ ví VoCoins, điểm học tập và log thời gian.

- [x] **Loại Bỏ Hoàn Toàn Mô Hình Cũ & Tối Ưu Hóa Gemini AI 2 Tầng**:
  - Thanh trừng triệt để `gemini-1.5-pro` và `gemini-pro` khỏi bộ nhớ đệm `localStorage` (`purgeInvalidGeminiModelCache`) và toàn bộ chuỗi fallback code trong `02-state-core.js`, `03-auth.js`, `04-decks-manager.js`, `07-speaking-engine.js`, `09-ai-mentor.js` để xóa bỏ hoàn toàn lỗi `models/gemini-1.5-pro is not found` (404).
  - Chuẩn hóa phân tầng mô hình:
    + Deep / Reasoning Tier: `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.0-flash-lite`.
    + Fast / Micro-Task Tier: `gemini-2.0-flash-lite`, `gemini-2.0-flash`, `gemini-1.5-flash`.
  - Nâng thời gian timeout gọi API lên 12,000ms cho các tác vụ sinh phương án gây nhiễu, giải thích và gợi ý VocaHint.

- [x] **Triệt Tiêu Độ Trễ 36 Giây Tải Subpath URL Trên GitHub Pages**:
  - Nâng cấp Service Worker (`sw.js` & `Release_App/sw.js`) với chiến lược Cache-first SPA Shell cho tất cả yêu cầu điều hướng (`event.request.mode === 'navigate'`). Phục vụ ngay lập tức file `index.html` trong bộ nhớ đệm mà không cần chờ đợi phản hồi 404 từ máy chủ GitHub Pages.
  - Giảm độ trễ khởi tạo `initSpaRouter` trong `01-router.js` xuống 60ms giúp giao diện chuyển màn hình và xử lý URL tức thì.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-59 Build 291)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-59 (Build 291)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-59 (Build 291)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-59 (Build 291)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-59 Build 291`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-59'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-59 (Build 291)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-59`)
  - `pubspec.yaml` (`version: 0.10.9+291`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-59`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-59_Windows_Portable.zip`, commit `v0.10.9-59 (Build 291)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-59 (Build 291)`)