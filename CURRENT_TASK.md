# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-50 (Build 282)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **ĐANG KIỂM THỬ XUẤT BẢN & ĐỒNG BỘ GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-50 Build 282)

- [x] **Sửa Lỗi Hiển Thị Chỉ Số Hồ Sơ Công Khai & Cá Nhân Thời Gian Thực (Public Profile Realtime Fetch)**:
  - Tải trực tiếp thời gian thực từ Cloud RTDB (`/users/{targetUid}.json` hoặc tìm kiếm qua `/users.json`) khi xem hồ sơ người dùng khác.
  - Hiển thị chuẩn xác và đầy đủ: Ví VoCoin, Chuỗi học tập Flow Streak, Định danh `@username`, Số lượng Người theo dõi (Followers), Số lượng Đang theo dõi (Following), Tiểu sử bản thân và Danh sách các bộ từ công khai.
  - Khắc phục triệt để lỗi đảo vị trí tham số giữa `openPublicProfileModal` và `openPublicProfileByAuthor` (trước đó hoán đổi `authorUid` và `deckId` dẫn đến tìm kiếm `adminStudentsData` trống và hiển thị chỉ số bằng 0).
  - Khi xem hồ sơ bản thân (`isCurrentUser = true`), tính toán và phản ánh chính xác số lượng followers/following từ `myFollowersMap` / `myFollowingMap` và `currentUser`.

- [x] **Mở Rộng Kích Thước Modal Hồ Sơ Cá Nhân & Công Khai (.ig-profile-modal)**:
  - Tăng `max-width` từ `560px` lên `820px` trong `src/styles/app.css` mang lại không gian hiển thị rộng rãi, bố cục máy tính thông thoáng và chuyên nghiệp.

- [x] **Sửa Lỗi Sập Bảng Tin Cộng Đồng Community Feed & Tối Ưu Mạng**:
  - Khắc phục lỗi runtime `ReferenceError: formatTimeAgo is not defined` trong `renderCommunityFeed` khiến giao diện bị treo vô tận tại `⏳ Đang tải bảng tin cộng đồng...`.
  - Định nghĩa toàn cục hàm tiện ích `formatTimeAgo` và `formatRelativeTime` trong `02-state-core.js`.
  - Bổ sung bộ điều khiển timeout `AbortController` 6 giây cho hàm `fetchAndRenderCommunityFeed` để ngăn chặn hiện tượng nghẽn mạng.

- [x] **Bổ Sung Sub-Modal Khoe Danh Hiệu Bài Viết Cộng Đồng (Badge Picker)**:
  - Tích hợp Modal con `modal-community-badge-picker` cho phép người dùng chọn nhanh huy hiệu thành tựu đã mở khóa để đính kèm vào bài viết chia sẻ cộng đồng.
  - Hỗ trợ xem trước huy hiệu đính kèm trực quan và nút hủy chọn linh hoạt.

- [x] **Bổ Sung Mục Điều Hướng VocaCommunity Trong Menu 3 Chấm**:
  - Thêm nút `💬 VocaCommunity` trong menu 3 chấm `#header-more-dropdown` tại thanh điều hướng chính, cho phép mở trực tiếp Bảng tin Cộng đồng.
  - Nâng cấp hàm `openProfileModal(initialTab)` hỗ trợ chuyển trực tiếp đến bất kỳ tab mục tiêu nào (`decks`, `stats`, `activity`, `saved`, `community`).

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-50 Build 282)**:
  - `src/components/header.html` (`v0.10.9-50`)
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-50 (Build 282)`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-50'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-50 (Build 282)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-50`)
  - `pubspec.yaml` (`version: 0.10.9+282`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-50`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-50_Windows_Portable.zip`, commit `v0.10.9-50`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-50 (Build 282)`)