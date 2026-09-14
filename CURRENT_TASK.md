# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-12 (Build 313)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** ✅ **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-12 Build 313)

- [x] **Issue 15 (Speaking Lab - Bỏ Hoàn Toàn Biểu Đồ Sóng Âm Waveform/Pitch Curve)**:
  - Gỡ bỏ hoàn toàn khối HTML `#spk-waveform-comparison-card` (canvas và legend sóng âm).
  - Loại bỏ các hàm và lệnh tính toán AudioContext waveform trong `07-speaking-engine.js`. Màn hình Speaking Lab nay cực kỳ ngắn gọn, vừa vặn không cần cuộn trên điện thoại.

- [x] **Issue 16 (Tự Động Đăng Bài & Phát Thông Báo Viền Phát Sáng Tím Từ @official)**:
  - Bổ sung hàm `checkAndSeedOfficialUpdatePost()` trong `03-auth.js` tự động tạo bài đăng cộng đồng từ `@official` khi phát hiện phiên bản mới `v0.10.10-12` (văn phong súc tích, hấp dẫn, dễ hiểu, không dùng thuật ngữ cao siêu).
  - Phát thông báo toàn hệ thống có viền phát sáng tím (`border: 1.5px solid #a855f7; box-shadow: 0 0 16px rgba(168,85,247,0.45)`) và huy hiệu ✨ CHÍNH THỨC.

- [x] **Issue 17 (Khắc Phục Điều Hướng Khi Chạm Vào Thông Báo Cột Mốc & Cộng Đồng)**:
  - Nâng cấp `handleNotificationClick(notifId)` trong `12-achievements.js` hỗ trợ xử lý mượt mà mọi loại thông báo `milestone`, `community`, `OFFICIAL_ANNOUNCEMENT`.
  - Tự động điều hướng và cuộn tới đúng bài viết qua `navigateToCommunityPost(targetPostId)` hoặc mở trang cá nhân công khai của tác giả.

- [x] **Issue 18 (Thêm Ô Tự Nhập Số Lượng Câu Hỏi Trong Modal Setup Luyện Viết)**:
  - Bổ sung ô input tự nhập số lượng câu hỏi (`#writing-qc-custom-input`) vào giữa `10 Câu` và `Toàn Bộ` trong `modal-writing-setup.html`.
  - Giới hạn $1 \le \text{count} \le \text{tổng số từ trong deck}$ và tích hợp hoàn hảo với thuật toán nhóm chủ đề trong `06c-writing-engine.js`.

- [x] **Issue 19 (AI Chấm Viết Câu Nhận Diện Phong Cách Ngữ Cảnh Đời Thường vs Học Thuật)**:
  - Nâng cấp prompt Gemini AI với cơ chế Smart Linguistic Register & Context Adaptation:
    + Register A (Conversational / Casual / Colloquial / Slang): Chấm theo tính tự nhiên, sinh động, chuẩn giao tiếp đời thường, không ép buộc cấu trúc học thuật IELTS gượng gạo.
    + Register B (Academic / Formal / C1-C2): Chấm theo chuẩn mực học thuật IELTS Task 2 nghiêm ngặt.

- [x] **Đồng Bộ Toàn Diện Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-12 Build 313)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-12 (Build 313)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-12 (Build 313)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-12 (Build 313)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-12 Build 313`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-12'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-12 (Build 313)'`)
  - `src/scripts/modules/06c-writing-engine.js` (`v0.10.10-12 Build 313`)
  - `src/scripts/modules/07-speaking-engine.js` (`v0.10.10-12 Build 313`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-12`)
  - `pubspec.yaml` (`version: 0.10.10+313`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-12`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-12_Windows_Portable.zip`, commit `feat: Release v0.10.10-12 (Build 313)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-12 (Build 313)`)