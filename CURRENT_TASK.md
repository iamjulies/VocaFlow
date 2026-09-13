# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-1 (Build 302)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH KIỂM THỬ VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-1 Build 302)

- [x] **Khắc Phục Triệt Để Lỗi Đồng Bộ Chỉ Số Biểu Đồ 7 Ngày Khi Xem Hồ Sơ Công Khai Của Người Khác (Full 2-Way Public Profile Stats & Ledger Synchronization)**:
  - Khắc phục lỗi khi người dùng khác vào xem Public Profile (tab Chi Số) của một tài khoản thì biểu đồ "Hoạt Động & Hiệu Suất 7 Ngày" và 3 thẻ thống kê hiển thị số 0 (0 phút, +0 Xu, +0 đ).
  - Nâng cấp `openPublicProfileByAuthor` để trích xuất đầy đủ `dailyStudyTime`, `ledger`, `dailyStats`, `points`, `flowDays` từ Cloud RTDB và gán đầy đủ vào `currentPublicProfileAuthor`.
  - Bổ sung cơ chế tự động tải dự phòng các nút chuyên sâu `/users/{targetUid}/dailyStudyTime.json` và `/users/{targetUid}/ledger.json` nếu dữ liệu chưa có sẵn ở nút gốc.
  - Đăng ký đa khóa cho tác giả trong `window.__vocaChartAuthorRegistry` theo `uid`, `targetUid`, `resolvedHandle`, `username`, `name` để cơ chế Tooltip của biểu đồ và các thẻ thống kê luôn tra cứu đúng người dùng.
  - Nâng cấp hàm `get7DayPerformanceData` trong `02-state-core.js` để đọc và phân tích mảng/đối tượng `ledger` cũng như `dailyStudyTime` của tác giả mục tiêu, tính toán chính xác tổng thời lượng học, VoCoin thu được và điểm rèn luyện 7 ngày qua khớp hoàn hảo giữa biểu đồ cá nhân và khi người khác vào xem.
  - Cập nhật `pushCurrentDatabaseToCloud` để đồng bộ cả `dailyStudyTime` và `ledger` lên Firebase RTDB mỗi khi có giao dịch hoặc phiên học mới.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-1 Build 302)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-1 (Build 302)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-1 (Build 302)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-1 (Build 302)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-1 Build 302`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-1'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-1 (Build 302)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-1`)
  - `pubspec.yaml` (`version: 0.10.10+302`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-1`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-1_Windows_Portable.zip`, commit `v0.10.10-1 (Build 302)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-1 (Build 302)`)