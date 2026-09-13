# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-62 (Build 294)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-62 Build 294)

- [x] **Tự Động Đóng & Dọn Dẹp Form Thêm Từ Mới (Add Word Modal Fix)**:
  - Khắc phục sự cố khi thêm từ mới nhấn "Lưu từ vựng" thì modal không tự động đóng, dẫn tới việc nếu người dùng bấm Lưu lần 2 sẽ xuất hiện cảnh báo trùng lặp từ (`Ảnh chụp màn hình 2026-09-13 151232.png`).
  - Cập nhật hàm `saveWordForm` tự động reset form, xóa trắng input, xóa cảnh báo trùng lặp và đóng `modal-word` an toàn ngay sau khi lưu và đồng bộ Cloud.

- [x] **Chuyển Đổi Nhận Xét Chuyên Sâu AI Thành Nút Theo Yêu Cầu (On-Demand AI Insights - Token Saver)**:
  - Thay vì tự động kích hoạt Gemini AI để tạo nhận xét chuyên sâu (mẹo ghi nhớ & nguồn gốc từ) trên mọi câu hỏi Trắc Nghiệm (`Ảnh chụp màn hình 2026-09-13 151709.png`, gây lãng phí token cho các từ không cần thiết), hệ thống đã chuyển sang hiển thị nút bấm: "✨ Tạo nhận xét AI".
  - Chỉ khi người dùng chủ động nhấp nút, Gemini AI mới được kích hoạt để phân tích sâu, lưu cache trong phiên làm bài để tái sử dụng ngay lập tức mà không gọi lại API.

- [x] **Hoàn Thiện Cơ Chế Giảm Trừ Lỗi Sai Đa Chế Độ (Mistakes Notebook Engine)**:
  - Đảm bảo bất kể từ vựng bị làm sai ở chế độ học nào, người dùng chỉ cần học và làm đúng ở 1 chế độ bất kỳ là được giảm 1 lần làm sai (`mistakeCount = mistakeCount - 1`). Khi số lần sai = 0, từ vựng được tự động loại bỏ vĩnh viễn khỏi Sổ Tay Lỗi Sai.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.9-62 Build 294)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-62 (Build 294)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-62 (Build 294)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-62 (Build 294)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-62 Build 294`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-62'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-62 (Build 294)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.9-62`)
  - `pubspec.yaml` (`version: 0.10.9+294`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-62`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-62_Windows_Portable.zip`, commit `v0.10.9-62 (Build 294)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-62 (Build 294)`)