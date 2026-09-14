# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-9 (Build 310)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** ✅ **HOÀN TẤT TRIỂN KHAI & CHUẨN BỊ KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-9 Build 310)

- [x] **Issue 1 (Đồng Bộ Túi Đồ Toàn Cục VocaHint & VocaSkip Cho Luyện Viết)**:
  - Đồng bộ Sentence Writing Lab với tài khoản người dùng thông qua `getUserHints()`, `getUserSkips()`, `setUserHints()`, `setUserSkips()`.
  - Tiêu thụ đạo cụ túi đồ có sẵn trước; khi hết đạo cụ tự động mở xác nhận mua thêm tức thì bằng VoCoin (50 VoCoin / Hint, 100 VoCoin / Skip) mà không ngắt quãng phiên học.
  - Cập nhật số lượng thời gian thực trên giao diện nút bấm (`#writing-btn-hint`, `#writing-btn-skip`) và badge.

- [x] **Issue 2 (Cơ Chế Cân Bằng Điểm Thưởng Balance v3 & Cảnh Báo Bỏ Cuộc Giữa Chừng)**:
  - Xây dựng `calculateSessionFinalPointsV3` trong `02-state-core.js` dành riêng cho Extended Learning Modes (Writing, Cloze, Dictation).
  - Phạt nặng khi bỏ cuộc sớm (<25% tiến độ: 0.15x; <50%: 0.35x; <75%: 0.60x; <100%: 0.80x).
  - Thưởng hoàn thành trọn vẹn 100%: 1.0x + Hệ số quy mô phiên học (1.05x ~ 1.25x) + Thưởng mốc vượt bậc (+15 Xu cho 5 từ, +40 Xu cho 10 từ, +80 Xu cho 20+ từ).
  - Tích hợp vào `promptStudyEarlyExit` và modal xác nhận thoát `modal-study-exit-confirm.html`.

- [x] **Issue 3 (Ngắt Âm Thanh Pháo Hoa Chúc Mừng Tức Thì)**:
  - Nâng cấp `playVocaSfx` và `stopVocaSfx` trong `02-state-core.js` với cơ chế theo dõi `activeSfxClones`.
  - Ngắt tức thì âm thanh chúc mừng pháo hoa khi người dùng đóng modal kết quả, làm lại bài hoặc rời khỏi màn hình luyện viết.

- [x] **Issue 4 (Cô Lập Hoàn Toàn VocaMentor AI Trong Các Phiên Học Tập)**:
  - Tự động ẩn nút FAB VocaMentor (`#btn-ai-mentor-fab`) trên tất cả các màn hình học tập (`screen-quiz`, `screen-spelling`, `screen-speaking`, `screen-autofc`, `screen-writing`, `screen-cloze`, `screen-dictation`).
  - Chặn mở hộp thoại Chatbot AI Mentor (`modal-ai-mentor`) khi đang trong phiên học để giữ sự tập trung tối đa cho người học.

- [x] **Issue 5 (Cá Nhân Hóa Trình Độ & Mục Tiêu Aim Band Học Viên)**:
  - Bổ sung trường chọn `currentBand` (Band điểm hiện tại: 4.0 ~ 8.0+) và `targetBand` (Mục tiêu hướng tới: 5.5 ~ 9.0+) trong Hồ sơ người dùng (`modal-profile.html`), lưu trữ vào `currentUser` và đồng bộ đám mây Cloud (`03-auth.js`).
  - Nạp động mục tiêu `targetBand` vào System Prompt của Gemini AI trong Sentence Writing Lab để đánh giá, chấm điểm và tạo bản Polished Native Rewrite chuẩn hóa theo đúng Target Band của học viên.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-9 Build 310)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-9 (Build 310)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-9 Build 310`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-9'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-9 (Build 310)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` & `GITHUB_RELEASE/VocaFlow_Windows_App/sw.js` (`vocaflow-pwa-v0.10.10-9`)
  - `pubspec.yaml` (`version: 0.10.10+310`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-9`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-9_Windows_Portable.zip`, commit `feat: Release v0.10.10-9 (Build 310)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-9 (Build 310)`)