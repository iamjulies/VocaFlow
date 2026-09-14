# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-11 (Build 312)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** ✅ **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-11 Build 312)

- [x] **Issue 11 (Writing Lab - Cấp Độ Siêu Khó Expert x4.0 Ẩn Nghĩa Tiếng Việt)**:
  - Cập nhật cấp độ Siêu Khó trong Writing Lab thành KHÔNG hiển thị nghĩa tiếng Việt (`[Ẩn nghĩa TV]`), buộc người học phải nhớ ngữ nghĩa và tự giác ứng dụng từ vựng vào đoạn văn (30-65 từ) để rèn luyện tư duy trực tiếp bằng tiếng Anh.
  - Cập nhật mô tả thẻ Siêu Khó trong Modal Thiết lập Luyện Viết (`modal-writing-setup.html`) thành `Ẩn nghĩa TV.`

- [x] **Issue 12 (Đồng Bộ Chuỗi Phiên Bản Footer & Cài Đặt Toàn Diện - Build 312)**:
  - Khắc phục triệt để tình trạng nhãn footer phiên bản bị lệch (`v0.10.10-8` -> `v0.10.10-11 (Build 312)`) trên màn hình Decks và Deck Detail.
  - Thêm cơ chế tự động hóa `updateAppVersionLabels()` đồng bộ tất cả các thẻ `.mini-footer-version` và `#settings-app-version-label`.

- [x] **Issue 13 (Khắc Phục Hiển Thị Danh Sách Từ Vựng Bắt Buộc Sử Dụng Trong Writing Lab)**:
  - Khắc phục sự cố không hiển thị thẻ từ vựng bắt buộc trên cả 4 cấp độ Writing Lab do lệch ID container (`writing-target-words-list` vs `writing-target-words-container`).
  - Đảm bảo danh sách thẻ từ vựng luôn hiển thị đầy đủ, nổi bật với loại từ, cấp độ CEFR và nghĩa tiếng Việt tương ứng.

- [x] **Issue 14 (Đồng Bộ Màu Sắc & Làm Mịn Biểu Đồ Sóng Âm Waveform Trong Speaking Lab)**:
  - Đồng bộ chuẩn xác 100% giữa Chú Thích (Legend) và Biểu Đồ Sóng Âm / Ngữ Điệu: Giọng mẫu Oxford là Xanh Da Trời (`#38bdf8`), Giọng học viên là Hồng Phấn (`#ec4899` / `#f472b6`).
  - Nâng cấp thuật toán trích xuất cao độ F0 với bộ lọc năng lượng và bộ lọc trung bình trượt 2 lớp, triệt tiêu hoàn toàn gai nhiễu trong đoạn im lặng/lấy hơi.
  - Vẽ đường biểu diễn ngữ điệu bằng đường cong Bezier/Spline mượt mà kèm hiệu ứng phát sáng Cyan/Rose.

- [x] **Đồng Bộ Toàn Diện Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-11 Build 312)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-11 (Build 312)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-11 Build 312`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-11'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-11 (Build 312)'`)
  - `src/scripts/modules/06c-writing-engine.js` (`v0.10.10-11 Build 312`)
  - `src/scripts/modules/07-speaking-engine.js` (`v0.10.10-11 Build 312`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-11`)
  - `pubspec.yaml` (`version: 0.10.10+312`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-11`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-11_Windows_Portable.zip`, commit `feat: Release v0.10.10-11 (Build 312)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-11 (Build 312)`)