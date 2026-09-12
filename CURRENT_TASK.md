# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-44 (Build 276)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** ✅ **HOÀN TẤT & ĐÃ KIỂM THỬ XUẤT BẢN**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-44 Build 276)

- [x] **Bộ Lọc Phân Loại Trung Tâm Thông Báo (Notification Filters)**:
  - Bổ sung và phân tách rõ ràng các nhóm thông báo:
    1. `🎁 Quà & Thưởng` (`REWARD`): Lượt quay quảng cáo, Vòng quay may mắn, Thưởng VIP, Quà tặng.
    2. `💎 Ví VoCoin` (`FINANCIAL`): Giao dịch nạp/rút/mua gói/nhận thưởng ví.
    3. `📘 VocaDeck mới` (`NEW_DECK`): Bộ từ vựng mới phát hành từ tác giả theo dõi.
    4. `👥 Tương tác` (`NEW_FOLLOWER`): Người theo dõi mới, kết nối Flower.
    5. `🔔 Hệ thống` (`SYSTEM`): Thông báo hệ thống, báo lỗi, quản trị viên.
  - Cập nhật bộ lọc tương tác thời gian thực tại `setNotificationFilter()` và giao diện tabs responsive `modal-notifications.html`.

- [x] **Công Cụ Căn Chỉnh & Cắt Ảnh Đại Diện Hình Tròn (Interactive Avatar Cropper)**:
  - Tạo mới `modal-avatar-cropper.html` với canvas tương tác chuẩn hóa:
    - Kéo rê trực tiếp trên canvas (pan/drag chuột và cảm ứng đa điểm touch).
    - Thanh trượt thu phóng mượt mà (0.8x đến 3.5x).
    - Nút xoay 90°, nút căn giữa tự động.
    - Khung tròn hướng dẫn và ô xem trước mini (live circular preview thumbnail).
    - Xuất ảnh độ phân giải cao 256x256 WebP/PNG, tự động nén tối ưu và đồng bộ lên Firebase RTDB.

- [x] **Chuẩn Hóa Đường Dẫn Chia Sẻ Hồ Sơ & Deep-Link Routing**:
  - Chuẩn hóa URL chia sẻ sang dạng thực tế `https://iamjulies.github.io/VocaFlow/?user=@handle` (hoặc domain động theo `window.location`).
  - Hỗ trợ Native Web Share API (`navigator.share`) kèm cơ chế sao chép clipboard thông minh.
  - Bổ sung nút "🔗 Chia Sẻ" trực tiếp trên thanh công cụ hồ sơ cá nhân (`modal-profile.html`).
  - Tích hợp bộ định tuyến liên kết sâu (Deep-link router) tự động mở hồ sơ công khai của tác giả khi truy cập link có `?user=@...`, `?u=...`, hoặc `?profile=...`.

- [x] **Định Dạng Dấu Phân Cách Hàng Nghìn Toàn Cục (Number Formatting Engine)**:
  - Xây dựng hàm `formatNumber(num)` chuẩn hóa các con số lớn (ví dụ: `23,155 VoCoin`, `1,250 từ`, `+1,200 Xu`).
  - Áp dụng trên toàn bộ giao diện: Header bar, Shop, Wallet Studio, Public Profile, Decks List,...
  - Bảo toàn tuyệt đối kiểu dữ liệu số nguyên thủy (`Number`) trong logic tính toán và lưu trữ cơ sở dữ liệu.

- [x] **Mở Rộng Kích Thước Modals Trên Màn Hình Rộng & Responsive Mobile**:
  - Tối ưu không gian hiển thị cho người dùng PC/Laptop với độ rộng lên đến `min(94vw, 840px - 1020px)`:
    - Hồ sơ cá nhân & Hồ sơ công khai (`modal-profile`, `modal-public-profile`): Bố cục chia cột hiện đại.
    - Trợ lý AI Mentor (`modal-ai-mentor`): Khung chat mở rộng tối đa 1020px.
    - Cửa hàng VocaShop (`modal-shop`): Lưới thẻ vật phẩm đa cột rộng rãi.
    - Xưởng Ví VoCoin (`modal-wallet-studio`), Xưởng Tạo Bộ Từ (`modal-ai-deck-studio`), Sổ Tay Lỗi Sai (`modal-mistake-notebook`), Cài Đặt Hệ Thống (`modal-settings`).
  - Đảm bảo tương thích co giãn hoàn hảo trên màn hình nhỏ/di động (`< 768px`).

- [x] **Kiến Trúc Script Mô-đun Hóa "Chia Để Trị"**:
  - Nâng cấp `build_vocaflow.ps1` tự động nạp các tệp script mô-đun trong `src/scripts/modules/*.js` trước khi xuất bản bản build hoàn chỉnh.

- [x] **Đồng Bộ Phiên Bản v0.10.9-44 (Build 276) Trên Toàn Bộ 7 Vị Trí:**
  - `src/components/header.html` (`v0.10.9-44`)
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-44 (Build 276)`)
  - `src/scripts/app.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-44'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-44 (Build 276)'`)
  - `sw.js` (`v0.10.9-44`, `vocaflow-pwa-v0.10.9-44`)
  - `pubspec.yaml` (`version: 0.10.9+276`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-44`)
  - `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt` & `CURRENT_TASK.md` (`v0.10.9-44`)
