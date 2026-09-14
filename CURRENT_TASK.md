# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-13 (Build 314)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-13 Build 314)

- [x] **Issue 20 (Bảng Tin Cộng Đồng - Luôn Hiển Thị Bài Đăng @official Ở Bộ Lọc Tất Cả)**:
  - Mở rộng `renderCommunityCenterFeed()` trong `03-auth.js` với `isOfficialPost()`.
  - Bộ lọc "Tất Cả" (`all`) luôn tự động tải và hiển thị mọi bài viết từ `@official` bất kể người dùng có follow hay chưa.

- [x] **Issue 21 (Tự Động Đăng Bài & Phát Thông Báo Vào Các Dịp Siêu Sale & Ngày Lễ Đặc Biệt)**:
  - Bổ sung hàm `checkAndSeedOfficialEventPosts()` tự động nhận diện ngày hiện tại: Siêu sale ngày đôi (1/1..12/12), Sinh nhật creator (10/08), Tết Dương Lịch, Valentine 14/2, 8/3, 30/4-1/5, Quốc khánh 2/9, 20/10, Halloween 31/10, 20/11, Giáng Sinh Noel 24-25/12.
  - Tự động đăng bài từ `@official` lên Bảng Tin Cộng Đồng kèm thông báo tím phát sáng (`isSpecialGlowing: true`) và kích hoạt giảm giá Cửa Hàng VocaShop / VocaVIP.

- [x] **Issue 22 (Khắc Phục Triệt Để Ảo Giác AI Mentor Khi Giải Thích Lỗi Chính Tả Trong Writing Lab)**:
  - Bổ sung quy tắc bắt buộc `[SPELLING & TYPO CORRECTION PROTOCOL - ZERO HALLUCINATION MANDATE]` vào Gemini System Prompt trong `06c-writing-engine.js`.
  - Nghiêm cấm AI giải thích thêm/bớt ký tự theo kiểu suy luận toán học (không còn lỗi "thêm chữ c thành accidentally").
  - Chuẩn hóa định dạng đối chiếu trực tiếp `[từ sai] -> [từ đúng]`.

- [x] **Issue 23 (Chuẩn Hóa Nhận Diện & Điều Hướng Hồ Sơ @official Chuẩn)**:
  - Sửa lỗi tạo hồ sơ fallback tạm `@vocaflow_offici` khi người dùng chạm vào thông báo hoặc liên kết profile.
  - Mở rộng toàn diện `isVocaFlowOfficial` và `getLiveUserRegistryEntry` trong `03-auth.js` để định danh chính xác "VocaFlow Chuẩn" (@official, 9,999 Followers, 999,999 VoCoin, 365 Ngày Flow, huy hiệu Đội Ngũ Phát Triển).

- [x] **Chuẩn Hóa Phân Danh Mục "Extended Learning Modes (β)"**:
  - Đánh dấu và phân định rõ ràng giữa 4 Chế độ học cơ bản (Learning Modes) và Chế độ học mở rộng (Extended Learning Modes β: Viết Câu / Writing Lab β; dự kiến: Cloze Test β, Dictation β, Dịch Thuật β).

- [x] **Đồng Bộ Toàn Diện Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-13 Build 314)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-13 (Build 314)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-13 (Build 314)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-13 (Build 314)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-13 Build 314`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-13'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-13 (Build 314)'`)
  - `src/scripts/modules/03-auth.js` (`VOCAFLOW_OFFICIAL_VERSION_KEY = 'v0.10.10-13'`)
  - `src/scripts/modules/06c-writing-engine.js` (`v0.10.10-13 Build 314`)
  - `src/scripts/modules/07-speaking-engine.js` (`v0.10.10-13 Build 314`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-13`)
  - `pubspec.yaml` (`version: 0.10.10+314`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-13`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-13_Windows_Portable.zip`, commit `feat: Release v0.10.10-13 (Build 314)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-13 (Build 314)`)