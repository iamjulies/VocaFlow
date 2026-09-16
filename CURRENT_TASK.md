# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-20 (Build 321)`  
> **Cập nhật lần cuối:** 2026-09-17  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI & KIỂM THỬ CDP 100% [PASS] -> TIẾN HÀNH MULTI-DEPLOY GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-20 Build 321)

- [x] **Quy hoạch Chế độ Học tập & Đánh dấu Extended Learning Modes (β)**:
  - 4 Chế độ cốt lõi (Learning Modes): Luyện Nói (Speaking), Auto Flashcard, Chính Tả (Spelling), Trắc Nghiệm (Quiz).
  - 4 Chế độ mở rộng nâng cao (Extended Learning Modes β): Viết Câu (VIP β), Điền Từ (VIP β), Nghe Gõ Câu (VIP β - Sắp ra mắt), Dịch Thuật (VIP β - Sắp ra mắt).

- [x] **Vấn đề 17: Tự Động Đăng Bài & Phát Thông Báo Phát Sáng @official Định Kỳ Theo Build (`03-auth.js`)**:
  - Triển khai `VOCAFLOW_OFFICIAL_RELEASES_REGISTRY` chứa danh mục bài đăng cho tất cả các build (từ v0.10.10-14 đến v0.10.10-20).
  - Khi người dùng cập nhật lên build mới, hệ thống tự động kiểm tra `localStorage` và Firebase RTDB để tạo bài viết công bố từ `@official` nếu chưa có, đồng thời gửi thông báo hệ thống phát sáng tím (`isGlowing: true`).

- [x] **Vấn đề 18: Thanh Chọn Chế Độ Học Phân Trang 2 Lượt Cốt Lõi vs Mở Rộng (`screen-deck-detail.html`, `modal-review-queue.html`, `04-decks-manager.js`, `app.css`)**:
  - Tách header chế độ học dài thành 2 trang trượt:
    + Trang 1: 4 Chế độ cốt lõi + Nút `Nâng cao (β) ➡️` (`#btn-deck-study-page-next`).
    + Trang 2: Nút `⬅️ Cơ bản` (`#btn-deck-study-page-prev`) + 4 Chế độ mở rộng nâng cao (Viết Câu, Điền Từ, Nghe Gõ Câu, Dịch Thuật).
  - Trạng thái trang được lưu trong `localStorage.getItem('vocaflow_deck_study_mode_page')`.

- [x] **Vấn đề 19: Tái Thiết Kế Thẻ Giải Thích Điền Từ Đoạn Văn Cloze 3 Tầng Trực Quan (`06d-cloze-engine.js`, `app.css`)**:
  - Thay thế văn bản giải thích liền mạch bằng 3 thẻ (`.cloze-explanation-card`) có viền màu sắc và biểu tượng trực quan:
    + 🏛️ Vị Trí Ngữ Pháp & Cấu Trúc (`.cloze-card-grammar`)
    + 🔗 Cụm Từ & Collocation Cố Định (`.cloze-card-colloc`)
    + 💡 Sắc Thái Ngữ Cảnh & Ý Nghĩa (`.cloze-card-context`)
  - Tự động hiển thị huy hiệu thông báo cấu trúc song hành liên từ (and/or) hợp lệ.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-20 Build 321`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-20 (Build 321)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-20 (Build 321)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-20 (Build 321)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-20 Build 321`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-20'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-20 (Build 321)'`)
  - `src/scripts/modules/06d-cloze-engine.js` (`v0.10.10-20 Build 321`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-20`)
  - `pubspec.yaml` (`version: 0.10.10+321`)
  - `VocaFlow_Desktop/Program.cs` (`v0.10.10-20`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-20 (Build 321)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`