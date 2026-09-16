# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-15 (Build 316)`  
> **Cập nhật lần cuối:** 2026-09-16  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-15 Build 316)

- [x] **Vấn đề 28 (Biểu Đồ Cột Thời Gian Học Tập Không Hiện Dữ Liệu Trong Hồ Sơ Công Khai / Thống Kê)**:
  - Tự động ghi nhận và tích lũy thời gian học tập thực tế (`screenMinutes` / `studyDurationSeconds`) cho từng ngày theo cấu trúc chuẩn hoá `studyStats.dailyPerformance[dateKey] = { studySeconds, wordsStudied, ... }`.
  - Khắc phục triệt để cơ chế trích xuất dữ liệu trong `get7DayPerformanceData(targetStats)`: Hỗ trợ tự động parse `screenMinutes` từ chuỗi, số thực (`parseFloat`), object và fallback chính xác, không còn phụ thuộc vào việc người dùng phải tự mở modal thống kê mới sync.
  - Tích hợp ghi `screenMinutes` lên Cloud profile khi sync dữ liệu người dùng.

- [x] **Vấn đề 29 (Tối Ưu Băng Thông Realtime Database - Chặn Triệt Để Lỗi Tràn Quota 20GB/10GB Firebase)**:
  - **Nguyên nhân gốc rễ**: Poller đồng bộ 2 chiều cũ cứ mỗi 30s lại gọi `handleManualSync(true)` kéo toàn bộ cây JSON `/users/${uid}.json` (kích thước 2-4MB mỗi lần kéo) làm tốn hàng chục GB băng thông tải xuống khi mở tab lâu. Ngoài ra poller thông báo 12s kéo toàn bộ cây thông báo và kho thư viện tải đi tải lại liên tục khi chuyển màn hình.
  - **Giải pháp tối ưu hóa 99.8% băng thông**:
    1. Thay thế poller 30s tải toàn bộ cây bằng poller kiểm tra mốc thời gian siêu nhẹ `/users/${uid}/lastSync.json` (chỉ 30 bytes) mỗi 120s. Chỉ khi timestamp trên mây lớn hơn local mới tiến hành pull đồng bộ thực sự.
    2. Poller thông báo (`startRealtimeNotificationListener`): Giãn chu kỳ từ 12s lên 60s (tab active) / 180s (tab hidden), bổ sung `?orderBy="$key"&limitToLast=15` để chỉ lấy 15 thông báo mới nhất thay vì tải toàn bộ cây.
    3. Bộ nhớ đệm TTL 5 phút (In-memory + localStorage Cache): Áp dụng cho dữ liệu bài viết cộng đồng (`community_posts`), kho thư viện bộ từ chia sẻ (`publicLibraryDecks`) và danh bạ VIP toàn cầu (`vip_users_index`) kèm tham số `limitToLast=50` tránh tải lặp khi chuyển màn hình.

- [x] **Vấn đề 30 (Đồng Bộ Trạng Thái Hoạt Động Online/Offline Tức Thì Giữa Các Tài Khoản)**:
  - Bổ sung trình lắng nghe sự kiện tương tác người dùng (`pointerdown`, `keydown`, `visibilitychange`) kết hợp cơ chế Throttled Heartbeat (90 giây) tự động gọi `heartbeatUserOnlineStatus()`.
  - Ghi đồng thời `lastActiveAt` vào cả hai node `/users/${uid}/lastActiveAt.json` và `/users/${uid}/profile/lastActiveAt.json` trên Realtime Database.
  - Luôn đính kèm `lastActiveAt: Date.now()` trong payload khi người dùng push database lên cloud.
  - Khi xem hồ sơ cá nhân công khai (`openPublicProfileByAuthor`), hệ thống trích xuất ưu tiên theo thứ tự `uData.lastActiveAt || uData.profile?.lastActiveAt || uData.profile?.lastSync || uData.lastSync` và tính toán relative time chính xác (dưới 5 phút hiển thị `🟢 Đang hoạt động`, sau đó hiển thị `⚪ Hoạt động X phút/giờ trước`).

- [x] **Vấn đề 31 (Khóa Chế Độ "Luyện Viết Câu" - Writing Lab Dành Riêng Cho Thành Viên VIP)**:
  - Đóng chặt quyền truy cập chế độ Luyện Viết Câu (`06c-writing-engine.js`): Kiểm tra `isUserVip()` trước khi mở `openWritingSetupModal` hoặc `startWritingMode`.
  - Hiển thị thông báo hướng dẫn nâng cấp VIP cho người dùng thường và mở form đăng nhập cho khách (Guest).
  - Cập nhật giao diện nút bấm tại chi tiết bộ từ thành `👑 Viết Câu (VIP)` và tiêu đề modal `(Writing Lab VIP)` trực quan, nổi bật.

- [x] **Đồng Bộ Toàn Diện Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-15 Build 316)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-15 (Build 316)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-15 (Build 316)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-15 (Build 316)`)
  - `src/components/modals/modal-writing-setup.html` (`Writing Lab VIP`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-15 Build 316`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-15'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-15 (Build 316)'`)
  - `src/scripts/modules/03-auth.js` (`VOCAFLOW_OFFICIAL_VERSION_KEY = 'v0.10.10-15'`)
  - `src/scripts/modules/06c-writing-engine.js` (`v0.10.10-15 Build 316`)
  - `src/scripts/modules/07-speaking-engine.js` (`v0.10.10-15 Build 316`)
  - `src/scripts/modules/08-wallet-economy.js` (`v0.10.10-15 Build 316`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-15`)
  - `pubspec.yaml` (`version: 0.10.10+316`)
  - `VocaFlow_Desktop/Program.cs` (`v0.10.10-15`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-15 (Build 316)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`