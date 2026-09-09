# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-alpha-27 (Build 259)`  
> **Cập nhật lần cuối:** 2026-09-09  
> **Trạng thái:** ✅ **ĐÃ HOÀN TẤT 100% - KIỂM THỬ THÀNH CÔNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-alpha-27)

- [x] **Nhiệm vụ 1: Khắc phục điều hướng thoát bài học trở về đúng Chi tiết Bộ từ (Seamless Deck Navigation)**
  - Người dùng phản ánh khi bấm nút "Quay lại" trong quá trình học Flashcard / Luyện viết (`studySourceContext === 'deck'`), app lại nhảy sang tab Danh Sách Bộ Từ (`screen-decks`), bắt người dùng phải bấm tìm và mở lại bộ từ.
  - Sửa đổi toàn bộ các hàm thoát dở bài học:
    * `doExecuteExitSpelling(done, total)`: Gọi `openDeckDetail(currentDeckId)` thay vì `showScreen('screen-deck-detail')`.
    * `doExecuteExitQuiz(done, total)`: Gọi `openDeckDetail(currentDeckId)` thay vì `showScreen('screen-deck-detail')`.
    * `doExecuteExitSpeaking(done, total)`: Gọi `openDeckDetail(currentDeckId)` thay vì `showScreen('screen-deck-detail')`.
    * `doExecuteExitAutoFlashcard()`: Gọi `openDeckDetail(currentDeckId)` thay vì `showScreen('screen-deck-detail')`.
  - Sửa đổi các hàm điều hướng khi hoàn thành bài học:
    * `exitSpellingToDeck()`: Gọi `openDeckDetail(currentDeckId)`.
    * `exitQuizToDeck()`: Gọi `openDeckDetail(currentDeckId)`.
  - Đảm bảo hiển thị đầy đủ tiêu đề, mô tả, danh sách từ vựng, bộ lọc và trạng thái thanh công cụ của bộ từ mà không yêu cầu người dùng phải thao tác lại từ đầu.

- [x] **Nhiệm vụ 2: Tách biệt VocaSpin sang VocaNoti và Chuẩn hóa Sổ Cái VocaStudio (VoCoin-Strict Economy)**
  - Người dùng phản ánh lượt quay VocaSpin thưởng VIP hằng ngày (+2 VocaSpin) bị ghi vào Sổ cái giao dịch VocaStudio với số tiền 0 Xu / nhãn VocaSpin lạ lẫm, làm mất tính nhất quán của ví VoCoin.
  - Sổ cái VocaStudio (`userLedger`) từ nay chỉ phục vụ duy nhất các giao dịch biến động tiền tệ VoCoin (`amount !== 0`).
  - Xóa bỏ hoàn toàn việc ghi bản ghi `VIP_DAILY_SPIN` vào `userLedger` trong hàm `grantDailyVipSpin()`.
  - Việc thưởng +2 VocaSpin VIP hằng ngày được thông báo độc quyền qua Trung Tâm Thông Báo VocaNoti (`addNotification('VIP_BONUS', '👑 Quà Tặng VocaVIP Hằng Ngày', ...)`).
  - Bổ sung cơ chế tự làm sạch (Self-Healing Cleanup) trên cả LocalStorage và Cloud: Tự động lọc sạch mọi bản ghi `VIP_DAILY_SPIN` và bản ghi có `amount === 0` trong `loadDatabase()`, `syncLedgerFromCloud()`, `syncDatabaseFromCloud()` và `renderLedgerList()`.

- [x] **Nhiệm vụ 3: Nâng cấp phiên bản toàn diện lên v0.10.9-alpha-27 (Build 259)**
  - `src/scripts/app.js`: Cập nhật hằng số `VOCAFLOW_APP_VERSION = 'v0.10.9-alpha-27'`, `VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-alpha-27 (Build 259)'`.
  - `src/components/header.html`: Cập nhật nhãn phiên bản trên Header `v0.10.9-alpha-27`.
  - `src/components/modals/modal-settings.html`: Cập nhật nhãn phiên bản trong Cài Đặt `v0.10.9-alpha-27 (Build 259)`.
  - `sw.js`: Cập nhật `CACHE_NAME = 'vocaflow-pwa-v0.10.9-alpha-27'`.
  - `pubspec.yaml`: Cập nhật `version: 0.10.9+259`.
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE\VOCAFLOW_OVERVIEW.txt`: Bổ sung chi tiết bản cập nhật `v0.10.9-alpha-27 (Build 259)`.
  - `GITHUB_RELEASE\push_github.ps1`: Cập nhật tên file zip và commit message lên `v0.10.9-alpha-27`.

- [x] **Nhiệm vụ 4: Kiểm thử và Biên dịch tự động**
  - Biên dịch toàn diện với `build_vocaflow.ps1` (45,039 dòng, 2664.4 KB).
  - Kiểm tra độ cân bằng ngoặc nhọn `{}`: 7,266 mở / 7,266 đóng (Chênh lệch: 0).
  - Kiểm thử Headless Edge trên `vocaflow.html`: Không có bất kỳ lỗi JavaScript / SyntaxError / ReferenceError nào.
  - Kiểm thử điều hướng thoát học và cơ chế miễn nhiễm sổ cái: `ALL_VERIFICATIONS_PASSED`.
