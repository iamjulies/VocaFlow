# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-60 (Build 292)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-60 Build 292)

- [x] **Khắc Phục Triệt Để Lỗi Phông Chữ & Bảng Màu Soạn Thảo (Rich Editor Toolbar Fix)**:
  - Khắc phục sự cố mất vùng chọn (selection blur) khi người dùng nhấp vào nút công cụ hoặc mở dropdown phông chữ / bảng màu trong thanh công cụ soạn thảo bài viết (`Ảnh chụp màn hình 2026-09-12 230246.png`).
  - Xây dựng hệ thống theo dõi vùng chọn liên tục `saveRichEditorSelection(editorId)` và khôi phục `restoreRichEditorSelection(editorId)` qua các sự kiện `keyup`, `mouseup`, `focus`, `input`, `select`.
  - Bổ sung bộ lắng nghe sự kiện `mousedown` toàn cục ngăn chặn mất tiêu điểm (`e.preventDefault()`) cho toàn bộ các nút công cụ `.rich-tool-btn`, chấm màu `.rich-color-dot` và nút emoji `.rich-emoji-btn`.
  - Nâng cấp `setRichPostFontFamily` và `setRichPostColor` tự động chuyển đổi thẻ định dạng cũ sang `<span style="...">` chuẩn CSS, đồng thời hỗ trợ áp dụng kiểu trực tiếp lên khung soạn thảo khi chưa bôi đen văn bản.

- [x] **Hệ Thống Thông Báo Tương Tác Thả Tim & Bình Luận Thời Gian Thực**:
  - Nâng cấp `togglePostLike` và `submitPostComment` trong `03-auth.js` tự động gửi thông báo thời gian thực lên Firebase Realtime Database (`/users/{authorUid}/notifications`) với cấu trúc chuẩn: `type: 'post_like'` / `'post_comment'`, `actionType: 'VIEW_COMMUNITY_POST'`, `postId`, `commentId`, `timestamp`, `isRead: false`.
  - Cập nhật bộ lọc thông báo `NEW_FOLLOWER` (Tương tác) và giao diện hiển thị trong `12-achievements.js`: icon ❤️ hồng `#ec4899` cho lượt thích và 💬 xanh `#38bdf8` cho bình luận.
  - Xử lý điều hướng thông minh khi nhấp vào thông báo: Tự động mở đúng bài viết qua `navigateToCommunityPost(targetPostId)`, mở phần bình luận nếu có, cuộn trang mượt mà và kích hoạt hiệu ứng phát sáng viền (`highlightAndScrollToPost`).

- [x] **Phân Tách Tuyệt Đối 3 Không Gian Cộng Đồng (3 Independent Community Spaces)**:
  - **Không gian 1 (`communitycenter`)**: Truy cập qua URL `/communitycenter`, `/community`, `/feed` hoặc dropdown Header "VocaCommunity". Hiển thị bảng tin bài viết của chính người dùng và những tác giả đang theo dõi (`post.authorUid === myUid || myFollowingMap[post.authorUid]`). Bổ sung pill lọc `👥 Đang Theo Dõi`, `👤 Bài Của Tôi`, `🌍 Khám Phá`, `🌟 Thành Tích`.
  - **Không gian 2 (`me/community`)**: Truy cập qua URL `/me/community` hoặc Hồ sơ ME -> Tab Cộng đồng. Chỉ hiển thị các bài viết do chính người dùng hiện tại đăng (`post.authorUid === myUid`).
  - **Không gian 3 (`@<username>/community`)**: Truy cập qua URL `/@<username>/community` hoặc trang hồ sơ tác giả công khai. Chỉ hiển thị bài viết của tác giả đó với đầy đủ các tương tác thả tim, bình luận và phản hồi.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-60 Build 292)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-60 (Build 292)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-60 (Build 292)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-60 (Build 292)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-60 Build 292`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-60'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-60 (Build 292)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-60`)
  - `pubspec.yaml` (`version: 0.10.9+292`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-60`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-60_Windows_Portable.zip`, commit `v0.10.9-60 (Build 292)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-60 (Build 292)`)