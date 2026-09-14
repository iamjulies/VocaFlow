# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-4 (Build 305)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH BUILD & KIỂM THỬ CDP**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-4 Build 305)

- [x] **Khắc Phục Rủi Ro Phụ Thuộc Endpoint Google Translate TTS Không Chính Thức (02-state-core.js)**:
  - Tích hợp Circuit Breaker thông minh (`googleTtsCircuitBreakerUntil`) theo dõi trạng thái lỗi HTTP 429/403/Timeout.
  - Tự động chuyển hướng không độ trễ sang Web SpeechSynthesis API với bộ giọng đọc tự nhiên (Natural Online, Google, Apple Siri/Samantha, Microsoft Zira/David, Linh/An).
  - Tự động bỏ qua prefetch ngầm khi Circuit Breaker đang hoạt động.

- [x] **Khắc Phục Rò Rỉ Bộ Nhớ (Memory Leak) Đối Với Audio Blob URLs (02-state-core.js)**:
  - Triển khai cấu trúc `BoundedLruAudioCache` với kích thước giới hạn tối đa 50 phần tử.
  - Tự động gọi `URL.revokeObjectURL(blobUrl)` khi một phần tử bị đẩy ra khỏi cache (Eviction) hoặc khi xóa cache (`clear()`).
  - Cung cấp hàm tiện ích `clearAudioBlobCache()` phục vụ dọn dẹp bộ nhớ RAM trình duyệt.

- [x] **Khắc Phục Xung Đột Ghi Đè Dữ Liệu Cloud Khi Mở Nhiều Thiết Bị (03-auth.js)**:
  - Khắc phục triệt để Race Conditions khi sử dụng đồng thời Desktop App và Mobile Web PWA.
  - Tích hợp Concurrency Mutex Lock (`isPushingDatabaseToCloud`) kèm hàng đợi tự động (`pendingCloudPushRequest`).
  - Nâng cấp cơ chế Pull-Before-Push: tự động kiểm tra timestamp `lastSync` trên Cloud, nạp và hợp nhất 2-Way Merge (bộ từ, từ vựng, sổ cái, từ sai, thời lượng học 7 ngày) trước khi đẩy lên Cloud.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-4 Build 305)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-4 (Build 305)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-4 (Build 305)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-4 (Build 305)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-4 Build 305`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-4'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-4 (Build 305)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-4`)
  - `pubspec.yaml` (`version: 0.10.10+305`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-4`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-4_Windows_Portable.zip`, commit `feat: Release v0.10.10-4 (Build 305)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-4 (Build 305)`)