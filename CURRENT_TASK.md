# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-0 (Build 301)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH KIỂM THỬ VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-0 Build 301)

- [x] **Tự Động Đồng Bộ & Khớp Tên, Avatar Bài Viết Trong Trung Tâm Cộng Đồng (Real-time Community Author Matcher)**:
  - Khắc phục lỗi khi xem bài viết trong Community Center thì tên và avatar của tác giả không được đồng bộ với dữ liệu hiện hành.
  - Xây dựng hàm `getLiveUserRegistryEntry(uid, name, handle)` tra cứu trực tiếp từ `globalVipRegistry` và `globalVipRegistryNameMap`.
  - Cập nhật các hàm `getCommunityAuthorAvatar`, `getCommunityAuthorName`, `getCommunityAuthorHandle`, `getCommunityAuthorIsVip`, `getCommunityCommentAuthorName`, `getCommunityCommentAuthorHandle`, `getCommunityCommentAuthorAvatar`, `getCommunityCommentAuthorIsVip` để khớp ngay thông tin hiển thị mới nhất của tác giả và người bình luận.
  - Kích hoạt đồng bộ hóa `initGlobalVipRegistry()` tự động mỗi khi mở Trung Tâm Cộng Đồng hoặc tải bảng tin.

- [x] **Cho Phép Xem Danh Sách Followers & Following Của Người Khác Khi Xem Public Profile (Social Graph Explorer)**:
  - Nâng cấp modal `modal-subscribers-list` và hàm `openSubscribersListModal(type, targetUid, targetName, targetHandle)` để hỗ trợ xem danh sách người theo dõi (Followers) và đang theo dõi (Following) của bất kỳ người dùng nào trên VocaFlow.
  - Khi xem hồ sơ công khai của tác giả khác, nhấp vào cột thống kê "Followers" hoặc "Following" sẽ mở danh sách chi tiết kèm avatar, tên hiển thị, danh hiệu VIP, handle @username và nút Theo dõi/Đang theo dõi tương tác trực tiếp.
  - Tích hợp điều hướng URL sâu: `/@handle/followers` và `/@handle/following`.

- [x] **Chặn Truy Cập Hồ Sơ Không Tồn Tại & Tự Động Chuyển Hướng Về Trang Chủ (Ghost/Fake Profile Protection)**:
  - Khi người dùng truy cập hoặc nhập đường dẫn tới một tài khoản không có thật (tài khoản mẫu, handle ngẫu nhiên, hoặc ID không tồn tại trong hệ thống đăng ký Firebase), hệ thống sẽ không mở hồ sơ trống.
  - Cơ chế xác thực nghiêm ngặt `isRealUser`: Kiểm tra tài khoản chính thức VocaFlow, tài khoản hiện tại, dữ liệu hồ sơ thật từ Cloud RTDB `/users/{targetUid}.json`, danh sách đăng ký `globalVipRegistry`, hoặc danh sách bộ từ công khai.
  - Nếu tài khoản không có thật: Tự động đóng modal, hiển thị thông báo "⚠️ Người dùng hoặc hồ sơ này không tồn tại!", và chuyển hướng ngay về màn hình chính (Trang chủ `/`).

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-0 Build 301)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-0 (Build 301)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-0 (Build 301)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-0 (Build 301)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-0 Build 301`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-0'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-0 (Build 301)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-0`)
  - `pubspec.yaml` (`version: 0.10.10+301`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-0`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-0_Windows_Portable.zip`, commit `v0.10.10-0 (Build 301)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-0 (Build 301)`)