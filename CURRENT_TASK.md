# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-47 (Build 279)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **ĐANG KIỂM THỬ XUẤT BẢN & ĐỒNG BỘ GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-47 Build 279)

- [x] **Tự Động Nhận Diện CEFR Đa Nét Nghĩa Trong Modal Soạn Từ Vựng (`modal-word.html` & `app.js`)**:
  - Đặt giá trị mặc định cho CEFR là `""` (Không / Tự động / Auto) thay vì gán cứng `'B1'`.
  - Cập nhật prompt AI AutoFill (`fetchWordFromGemini`): Tự động phân tích độ khó thực tế theo chuẩn Oxford/Cambridge và gán đúng cấp độ CEFR (`A1` - `C2`) riêng biệt cho từng nét nghĩa.
  - Tự động fallback `'B1'` an toàn khi lưu thủ công không qua AI.

- [x] **Chuẩn Hóa Thước Đo Thời Gian Meme Cat & Đồng Bộ Cài Đặt Cloud (`modal-settings.html` & `app.js`)**:
  - Tinh chỉnh slider: `min="1.0" max="4.0" step="0.5" value="2.5"` giúp mốc `2.5s (Chuẩn)` nằm chính xác tại tâm giữa (50%).
  - Khởi tạo chính xác trạng thái checkbox và slider trong `openSettingsModal()`.
  - Bổ sung `vipCatMemesEnabled` và `vipCatMemesDuration` vào payload đồng bộ `pushCurrentDatabaseToCloud()` và `applyCloudSettingsPatch()`.

- [x] **Tinh Chỉnh Prompt Đố Vui Trắc Nghiệm VocaMentor AI (`app.js`)**:
  - Khi bấm chip nhanh "🎯 Đố vui trắc nghiệm", điền sẵn câu lệnh `🎯 Tạo cho tao 1 câu đố trắc nghiệm chủ đề: ` vào ô chat, focus và đưa con trỏ văn bản về cuối câu thay vì tự động gửi câu hỏi ngẫu nhiên.

- [x] **Vòng Xoay Loading Toàn Cục (Global Loading Spinner Overlay) (`app_template.html`, `app.css`, `app.js`)**:
  - Bổ sung overlay `#app-global-loader` kèm các hàm điều khiển `showAppLoading(msg)` và `hideAppLoading()`.
  - Tự động kích hoạt khi chuyển trang hoặc nạp dữ liệu hồ sơ công khai từ Cloud.

- [x] **Khắc Phục Lỗi TDZ & Hoàn Thiện Định Tuyến Hồ Sơ Cá Nhân /@<username> (`app.js`)**:
  - Khắc phục triệt để lỗi `ReferenceError` (TDZ) trong `openPublicProfileByAuthor`.
  - Đảm bảo cơ chế định tuyến động `/@<username>` hoạt động trơn tru.

- [x] **Đồng Bộ Phiên Bản v0.10.9-47 (Build 279) Trên Toàn Bộ 7 Vị Trí:**
  - `src/components/header.html` (`v0.10.9-47`)
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-47 (Build 279)`)
  - `src/scripts/app.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-47'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-47 (Build 279)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-47`)
  - `pubspec.yaml` (`version: 0.10.9+279`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-47`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-47`)
