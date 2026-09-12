# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-52 (Build 284)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **ĐANG KIỂM THỬ XUẤT BẢN & ĐỒNG BỘ GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-52 Build 284)

- [x] **Mở Rộng Deep Linking Toàn Diện & Tự Động Điền Mã Giới Thiệu**:
  - Hỗ trợ định tuyến liên kết trực tiếp:
    + Giới Thiệu Bạn Bè - Nhận VocaVIP Hoàng Gia: `/invite` hoặc `/invite/@<username>/<mã giới thiệu>` hoặc `/invite/<mã giới thiệu>`.
    + Video Giới Thiệu & Nhận Thưởng (+1 VocaSpin): `/ads` (hoặc `/ad`, `/rewarded-ad`).
    + Ánh xạ bài viết trực tiếp: `/@<username>/post/<postId>` và `/community/post/<postId>`.
  - Khi truy cập link giới thiệu có mã, ứng dụng tự động mở Modal Giới Thiệu và điền sẵn mã giới thiệu vào ô input, tân thủ chỉ cần 1 cú nhấp "Nhận Quà" để nhận ngay phần thưởng tân thủ.

- [x] **Chuẩn Hóa Link Mời Bạn Bè Định Dạng Cá Nhân Hóa**:
  - Nâng cấp link tạo ra trong Modal Giới Thiệu Bạn Bè (`modal-referral`):
    + Định dạng: `https://iamjulies.github.io/VocaFlow/invite/@<username>/<mã giới thiệu>` (hoặc `/invite/<mã giới thiệu>` nếu chưa đặt username).
    + Đồng bộ cập nhật cả ô input hiển thị và hàm sao chép link `copyMyReferralLink()`.

- [x] **Đồng Bộ Hóa Avatar Tác Giả Thời Gian Thực Trên Toàn Bộ Bài Viết (Avatar Sync Fix)**:
  - Xây dựng cơ chế giải quyết avatar động `getCommunityAuthorAvatar(post)`: Đảm bảo bài viết luôn ưu tiên lấy avatar mới nhất của tác giả (từ `currentUser`, `adminStudentsData` hoặc cache hồ sơ) thay vì giữ cứng chuỗi avatar tĩnh lúc tạo bài.
  - Thêm cơ chế Cascade Update: Khi người dùng đổi ảnh đại diện mới trong phần Hồ sơ cá nhân, hệ thống tự động cập nhật avatar mới cho tất cả các bài viết mà người dùng đã đăng trên Firebase RTDB `/community_posts`.

- [x] **Hoàn Thiện Tương Tác Like, Bình Luận & Độ Trung Thực Đa Phương Tiện Trong Public Profile**:
  - Sửa lỗi tương tác: Gắn đúng hàm `togglePostLike()` và bổ sung hệ thống bình luận có thể đóng/mở (`togglePubPostCommentsSection()`), cho phép người xem thả tim, đọc bình luận, trả lời bình luận và đăng bình luận mới ngay trong tab Cộng Đồng của Hồ Sơ Công Khai.
  - Hiển thị đầy đủ hình ảnh đính kèm (`post.image || post.imageUrl`), danh hiệu thành tích (`post.badge`), thẻ từ vựng và nút Chỉnh sửa/Xóa (nếu xem bài của chính mình).
  - Nút Chia Sẻ bài viết sinh URL định dạng chuẩn `/@<username>/post/<postId>`, giúp người nhận điều hướng chính xác đến bài viết với hiệu ứng cuộn mượt và highlight nổi bật.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-52 Build 284)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-52 (Build 284)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-52 (Build 284)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-52 (Build 284)`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-52'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-52 (Build 284)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-52`)
  - `pubspec.yaml` (`version: 0.10.9+284`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-52`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-52_Windows_Portable.zip`, commit `v0.10.9-52`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-52 (Build 284)`)