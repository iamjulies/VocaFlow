# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-49 (Build 281)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **ĐANG KIỂM THỬ XUẤT BẢN & ĐỒNG BỘ GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-49 Build 281)

- [x] **Triệt Tiêu Hoàn Toàn Lỗi Gemini API 404 & Chuẩn Hóa Chuỗi Model Khả Dụng**:
  - Chuẩn hóa danh sách model Google Gemini khả dụng (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`, `gemini-1.5-pro` và vision: `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`).
  - Loại bỏ triệt để các chuỗi định danh model không tồn tại hoặc gây lỗi 404 (`gemini-3.5-flash-lite`, `gemini-2.5-flash-lite`, `gemini-2.0-flash-lite`, `gemini-3.7-flash`).
  - Tích hợp chuỗi fallback chuẩn mực xuyên suốt 6 engine: VocaMentor Chatbot, AI AutoFill từ vựng, Đánh giá phát âm AI Speaking Lab, Thử kết nối API Key và Tạo bộ từ vựng tự động.

- [x] **Bổ Sung Tab "💬 Cộng Đồng" (Community Feed) Trong Hồ Sơ Cá Nhân**:
  - Trình soạn thảo bài viết tiện lợi: Viết văn bản tự do, đính kèm ảnh nén tự động tối đa 1.5MB, đính kèm huy hiệu thành tựu người dùng đã đạt được.
  - Bộ lọc linh hoạt 3 chế độ: "Tất Cả", "Bài Của Tôi", và "Thành Tích".
  - Tương tác bài viết thời gian thực: Tên tác giả, huy hiệu VIP/Official, thời gian đăng tương đối, nút Thả tim cô lập chống giật lag, Bình luận phản hồi trực tiếp `@handle`, Chỉnh sửa/Xóa bài viết của tác giả, Sao chép liên kết chia sẻ trực tiếp (`/@<username>?post=<id>`).
  - Cơ chế tự động đăng bài kỷ niệm (Milestone Auto-Post) khi mở khóa huy hiệu Kim Cương/Huyền Thoại, hoàn thành phiên học >= 30 hoặc 50 từ, đạt chuỗi Flow Streak 7, 30, 100, 200, 365 ngày, và khi kích hoạt VocaVIP.
  - Bắn thông báo Realtime Cloud (`dispatchFollowersNotification`) gửi đến tất cả người theo dõi khi có bài viết hoặc mốc kỷ niệm mới.

- [x] **Sửa Lỗi Hiển Thị & Thống Kê Modal Hoàn Thành Phiên Học (Celebration Modals)**:
  - Khắc phục các biến số không khớp trong Quiz, Spelling, Speaking: thời lượng học thực tế (phút:giây), tốc độ giây/từ (SPW / SPQ), độ chính xác (%), thưởng VoCoin theo chuẩn hệ số Balance v2, nhãn cấp độ khó, bộ đếm từ sai/bỏ qua/manh mối.

- [x] **Tối Ưu Hóa Tốc Độ Đồng Bộ Realtime Cloud (Fast Cloud Sync)**:
  - Cơ chế Debounce Coalescing 1200ms gom cụm các thao tác lưu trữ liên tiếp, khử trùng dữ liệu payload loại bỏ các trường thừa không cần thiết, bộ điều khiển timeout 8s chống nghẽn mạng.

- [x] **Cơ Chế Miễn Trừ / Đặt Lại Hàng Đợi Ôn Tập Quá Hạn SRS (Overdue Reset)**:
  - Cập nhật trường `updatedAt` của từ vựng ngay khi vượt qua bài tập hoặc hoàn thành lượt học trong Quiz, Spelling, Speaking và Auto-Flashcards.
  - Đẩy khoảng thời gian ôn tập tiếp theo và làm mới banner hàng đợi ôn tập hằng ngày (`renderDailyReviewBanner`).

- [x] **Đồng Bộ Dữ Liệu Hồ Sơ Công Khai Thời Gian Thực Từ Cloud (Public Profile Realtime Fetch)**:
  - Tinh gọn 7 truy vấn rời rạc thành 1 lượt nạp duy nhất `/users/{targetUid}.json` lấy đầy đủ Ví VoCoin, Flow Streak, @username, tiểu sử, huy hiệu ghim và danh sách bộ từ công khai.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-49 Build 281)**:
  - `src/components/header.html` (`v0.10.9-49`)
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-49 (Build 281)`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-49'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-49 (Build 281)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-49`)
  - `pubspec.yaml` (`version: 0.10.9+281`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-49`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-49`)