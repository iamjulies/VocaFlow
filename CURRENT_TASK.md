# CURRENT TASK & TRẠNG THÁI CÔNG VIỆI HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-61 (Build 293)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-61 Build 293)

- [x] **Nâng Cấp & Khắc Phục Lỗi Sổ Tay Lỗi Sai (Mistakes Notebook Engine)**:
  - Khắc phục sự cố khi nhấp vào "🎯 Ôn Trắc Nghiệm", "✍️ Luyện Viết", "🎙️ Luyện Nói" hoặc "🎯 Ôn từ này" trong modal Sổ Tay Lỗi Sai bị bỏ qua màn hình chọn cấp độ (`Ảnh chụp màn hình 2026-09-13 140815.png`). Cập nhật mở chuẩn xác các Setup Modals (`openQuizSetupModal`, `openSpellingSetupModal`, `openSpeakingSetupModal`).
  - Sửa cơ chế gỡ từ sai: Dù từ vựng bị làm sai ở chế độ học nào, chỉ cần làm đúng ở BẤT KỲ chế độ nào cũng đủ điều kiện khắc phục lỗi sai.
  - Cơ chế giảm dần số lần sai: Mỗi lần làm đúng sẽ giảm 1 lần sai (`mistakeCount = mistakeCount - 1`). Khi số lần sai = 0, từ vựng tự động bị loại bỏ vĩnh viễn khỏi Sổ Tay Lỗi Sai. Cập nhật tức thì số đếm trên Header, Chi tiết VocaDeck và Modal.

- [x] **Đồng Bộ 2 Chiều An Toàn Biểu Đồ 7 Ngày Thời Gian Học (Daily Study Time Two-Way Sync)**:
  - Bổ sung `dailyStudyTime` vào payload đẩy lên Firebase RTDB trong `pushCurrentDatabaseToCloud`.
  - Bổ sung Mục 16 trong `mergeCloudDataIntoLocal` thực hiện hợp nhất 2 chiều an toàn giữa local và Cloud cho tất cả các ngày (`Math.max(local[date] || 0, cloud[date] || 0)`), bảo toàn tuyệt đối dữ liệu thời gian học thực tế trên biểu đồ 7 ngày khi đổi thiết bị hoặc nạp lại ứng dụng.

- [x] **Tinh Chỉnh Prompt AI Điền Từ & Chuẩn Hóa Định Nghĩa Siêu Cô Đọng (VocaFill AI)**:
  - Cập nhật prompt Gemini AI biên soạn từ điển trong `06-spelling-engine.js` và `04-decks-manager.js`: Nghĩa tiếng Việt (`definition`) bắt buộc siêu cô đọng (1-4 từ, ví dụ: "Yêu thích", "Chạy", "Giống như", "Sở thích"), tuyệt đối KHÔNG chứa dấu phẩy (,), dấu chấm phẩy (;), dấu chấm lửng (...), chữ "và", dấu ngoặc đơn/vuông hay cụm rườm rà "ai, cái gì", "ai đó, cái gì đó".
  - Mọi thông tin giải thích ngữ cảnh, ngữ pháp, giới từ đi kèm bắt buộc đưa vào trường `note` (Ghi chú).
  - Đối với từ ngữ thô tục, tiếng lóng, từ cấm (vulgar / taboo / swear words): AI bắt buộc điền nguyên từ tiếng Việt đầy đủ, không được viết tắt hay thêm dấu sao (*).
  - Nâng cấp hàm `cleanVietnameseDefinition` tự động lọc bỏ dấu ngoặc đơn, cụm rườm rà và trích xuất đúng nét nghĩa cốt lõi.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-61 Build 293)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-61 (Build 293)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-61 (Build 293)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-61 (Build 293)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-61 Build 293`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-61'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-61 (Build 293)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.9-61`)
  - `pubspec.yaml` (`version: 0.10.9+293`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-61`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-61_Windows_Portable.zip`, commit `v0.10.9-61 (Build 293)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-61 (Build 293)`)