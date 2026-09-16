# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-19 (Build 320)`  
> **Cập nhật lần cuối:** 2026-09-16  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI & KIỂM THỬ CDP 100% [PASS] -> TIẾN HÀNH MULTI-DEPLOY GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-19 Build 320)

- [x] **Quy hoạch Chế độ Học tập & Đánh dấu Extended Learning Modes (β)**:
  - 4 Chế độ cốt lõi (Learning Modes): Flashcard, Auto Flashcard, Spelling, Speaking, Quiz.
  - 4 Chế độ mở rộng nâng cao (Extended Learning Modes β): Sentence Writing Lab β, Cloze Test β (sắp tới: Dictation β, Translation β).

- [x] **Vấn đề 13: Khóa VIP Độc Quyền Cho Chế Độ Điền Từ Cloze Test β (`06d-cloze-engine.js`, `04-decks-manager.js`, `screen-deck-detail.html`, `modal-review-queue.html`)**:
  - Gated tính năng Cloze Test qua `isUserVip()`. Người dùng chưa đăng nhập (Guest) hoặc người dùng thường (Free) bị chặn truy cập với thông báo modal nâng cấp VocaVIP (`openVipPricingModal()` / `openGuestFeatureLockModal()`).
  - Thêm huy hiệu vương miện VIP: `👑 Điền Từ (VIP β)` tại Deck Detail và Hàng Đợi Ôn Tập (Review Queue).

- [x] **Vấn đề 14: Model Tiers Cao Cấp & Cơ Chế Timeout 16s Cho Cloze Test Khó & Siêu Khó (`06d-cloze-engine.js`)**:
  - Khi tạo đoạn văn ở cấp độ `hard` và `expert`, hệ thống ưu tiên các model Flash có năng lực lập luận cao (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-3.5-flash`) thay vì dùng lite models.
  - Bổ sung cơ chế timeout 16s mỗi model request và tự động fallback nhanh, ngăn chặn triệt để tình trạng treo màn hình chờ >1 phút.

- [x] **Vấn đề 15: Quy Tắc Tối Thiểu 5 Từ Vựng & Mở Rộng Từ Ngữ Cảnh AI Tự Động (`06d-cloze-engine.js`, `06c-writing-engine.js`, `04-decks-manager.js`, `05-quiz-engine.js`, `06-spelling-engine.js`, `07-speaking-engine.js`)**:
  - Khi người học tự chọn từ vựng thủ công mà số lượng < 5 từ: Chặn khởi tạo trên tất cả 8 chế độ học tập với cảnh báo `⚠️ Vui lòng chọn tối thiểu 5 từ vựng để bắt đầu phiên học tập!`.
  - Khi bộ từ hoặc hàng đợi có sẵn < 5 từ hiện hữu:
    + 4 chế độ cốt lõi (Flashcard, Auto Flashcard, Spelling, Speaking, Quiz): Chặn khởi tạo và yêu cầu thêm từ vào bộ từ.
    + 2 chế độ mở rộng nâng cao (Writing Lab β, Cloze Test β): AI tự động bổ sung thêm các từ vựng mở rộng cùng chủ đề (`ensureMinimumClozeWords`, `ensureMinimumWritingWords`) để đạt tối thiểu >= 5 từ, giúp tạo đoạn văn phong phú và hấp dẫn.

- [x] **Vấn đề 16: Dynamic Animated AI Loading Spinner Đa Vòng Sáng Tạo (`app.css`, `screen-cloze.html`, `06d-cloze-engine.js`)**:
  - Thay thế icon tĩnh 🧩 bằng vòng xoay AI đa tầng phát sáng (`.ai-spinner-container`, `.ai-spinner-outer-ring`, `.ai-spinner-inner-ring`, `.ai-spinner-center-icon`) kết hợp sóng hiệu ứng chấm nhảy (`.ai-loading-dots`).

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-19 Build 320`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-19 (Build 320)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-19 (Build 320)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-19 (Build 320)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-19 Build 320`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-19'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-19 (Build 320)'`)
  - `src/scripts/modules/06d-cloze-engine.js` (`v0.10.10-19 Build 320`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-19`)
  - `pubspec.yaml` (`version: 0.10.10+320`)
  - `VocaFlow_Desktop/Program.cs` (`v0.10.10-19`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-19 (Build 320)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`