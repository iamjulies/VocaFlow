# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-53 (Build 285)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-53 Build 285)

- [x] **Chỉnh Sửa Bài Viết Toàn Diện & Modal Chuyên Nghiệp (Full Post Editing)**:
  - Bổ sung Modal Chỉnh Sửa Toàn Diện (`modal-edit-community-post`): Cho phép tác giả cập nhật trọn vẹn nội dung văn bản rich text, thay đổi/xóa hình ảnh đính kèm (hỗ trợ nén Canvas), và chọn lại/gỡ bỏ danh hiệu thành tích đính kèm.
  - Cơ chế lưu trữ thông minh: Đồng bộ dữ liệu cập nhật tức thì lên Firebase RTDB `/community_posts` và bộ nhớ cục bộ, tự động hiển thị nhãn "(đã chỉnh sửa)" minh bạch.

- [x] **Thanh Công Cụ Soạn Thảo Phong Phú (Rich Text Formatting Toolbar)**:
  - Tích hợp thanh công cụ soạn thảo trực quan cho cả khung đăng bài mới và modal chỉnh sửa:
    + Định dạng cơ bản: In đậm (**B**), In nghiêng (*I*), Gạch chân (<u>U</u>), Gạch ngang (<s>S</s>).
    + Cỡ chữ tùy chỉnh: Nhỏ (12px), Vừa (14px), Lớn (16px), Tiêu đề (20px).
    + Phông chữ: Inter / Hệ thống, Tròn trịa (Quicksand), Đơn cách (Monospace), Cổ điển (Serif).
    + Bảng chọn màu sắc chữ đa dạng (Color Palette) với các tông màu chuẩn VocaFlow.
    + Canh lề văn bản: Canh trái, Canh giữa, Canh phải.
    + Bảng chọn Emoji cảm xúc nhanh & Nút Xóa định dạng.
  - Bộ lọc và làm sạch mã an toàn `sanitizePostHtml()` chống XSS toàn diện mà vẫn giữ trọn vẹn kiểu dáng chữ viết.

- [x] **Định Dạng Thời Gian Phong Cách Facebook & Tooltip Ngày Giờ Chuẩn Xác**:
  - Nâng cấp `formatTimeAgo()` theo chuẩn mạng xã hội: "Vừa xong", "X phút trước", "X giờ trước", "Hôm qua lúc HH:mm", "D tháng M lúc HH:mm".
  - Bổ sung thuộc tính `title` với hàm `formatFullExactDateTime()`: Rê chuột hoặc chạm giữ vào thời gian sẽ hiển thị chính xác Thứ, Ngày Tháng Năm và Giờ Phút Giây.

- [x] **Trình Phóng To Xem Ảnh Toàn Màn Hình (Image Lightbox Viewer Modal)**:
  - Thiết kế Modal Xem Ảnh Độc Lập Chuyên Nghiệp (`modal-image-viewer`):
    + Nhấp vào bất kỳ hình ảnh nào trong bài viết (trên Bảng tin chung hoặc Hồ sơ công khai) để mở trình xem ảnh độ nét cao.
    + Bộ điều khiển mạnh mẽ: Phóng to (Zoom In), Thu nhỏ (Zoom Out), Xoay ảnh 90° (Rotate), Đặt lại kích thước (Reset), Tải ảnh về máy (Download), Sao chép liên kết ảnh (Copy Link).
    + Hỗ trợ cuộn chuột (Mouse Wheel) để zoom mượt và kéo rê (Drag to Pan) khi đang phóng to ảnh.

- [x] **Đồng Bộ Chỉ Số Hồ Sơ Công Khai & Loại Bỏ Khung Rỗng Danh Hiệu**:
  - Khắc phục triệt để lỗi bất đồng bộ ID DOM (`pub-view-stat-decks-num` và `pub-view-stat-decks`) khi xem hồ sơ công khai, đảm bảo số bộ từ và số từ chia sẻ luôn nhảy số chuẩn xác theo thời gian thực.
  - Loại bỏ khung placeholder danh hiệu rỗng trên khung tạo bài viết khi chưa chọn đính kèm danh hiệu.

- [x] **Bảo Đảm Tuyệt Đối Định Tuyến Deep Links Không Phân Biệt Hoa Thường**:
  - Chuẩn hóa điều hướng trực tiếp cho các route: `/vocavip` (bảng giá VIP), `/flowtreak` & `/flowstreak` (dòng chảy học tập), `/notifications` (thông báo), `/vocamail` (hòm thư), `/report` & `/feedback` (báo lỗi).
  - Xuất khẩu toàn bộ các hàm mở modal tương ứng ra phạm vi toàn cục `window.*` để router gọi an toàn mọi lúc mọi nơi.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-53 Build 285)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-53 (Build 285)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-53 (Build 285)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-53 (Build 285)`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-53'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-53 (Build 285)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-53`)
  - `pubspec.yaml` (`version: 0.10.9+285`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-53`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-53_Windows_Portable.zip`, commit `v0.10.9-53`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-53 (Build 285)`)