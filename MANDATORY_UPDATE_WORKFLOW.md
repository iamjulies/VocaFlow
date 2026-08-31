# 📌 QUY TRÌNH BẮT BUỘC MỖI KHI CẬP NHẬT VOCAFLOW (MANDATORY UPDATE WORKFLOW)

> **LƯU Ý QUAN TRỌNG DÀNH CHO AI AGENT & DEVELOPER:**
> Mỗi khi thực hiện cập nhật mã nguồn VocaFlow (sửa lỗi, thêm tính năng, nâng version), **BẮT BUỘC PHẢI THỰC HIỆN ĐỦ 4 BƯỚC VÀ TUÂN THỦ NGUYÊN TẮC BẢO TOÀN DỮ LIỆU SAU ĐÂY** mà không được bỏ sót bất kỳ điểm nào:

---

## 1. 🖥️ BƯỚC 1: CẬP NHẬT APP EXE (WINDOWS DESKTOP APPLICATION)
* **Đường dẫn thư mục**: `C:\Users\DELL\Documents\Modding\browser\Release_App`
* **Công việc cụ thể**:
  1. Đồng bộ `vocaflow.html`, `sw.js`, `manifest.json`, thư mục `icons/`, `audio/` từ thư mục gốc `C:\Users\DELL\Documents\Modding\browser` vào `Release_App`.
  2. Đảm bảo ứng dụng máy tính `VocaFlow.exe` luôn nhúng và khởi chạy đúng phiên bản HTML & Service Worker mới nhất.
  3. Kiểm tra nhị phân `VocaFlow.exe` và các thư viện `WebView2Loader.dll`, `Microsoft.Web.WebView2.*.dll` hoạt động bình thường.

---

## 2. 🌐 BƯỚC 2: CẬP NHẬT WEB APP & GÓI PHÁT HÀNH (GITHUB_RELEASE)
* **Đường dẫn thư mục**: `C:\Users\DELL\Documents\Modding\browser\GITHUB_RELEASE`
* **Công việc cụ thể**:
  1. Sao chép `vocaflow.html` vào `GITHUB_RELEASE\vocaflow_web_single_file.html` và `GITHUB_RELEASE\VocaFlow_Windows_App\vocaflow.html`.
  2. Đồng bộ `sw.js`, `manifest.json`, `index.html` tại thư mục gốc và các thư mục liên quan.
  3. **Đóng gói file ZIP Portable**: Nén thư mục `Release_App` thành `VocaFlow_v0.10.8_Windows_Portable.zip` (hoặc tên theo version mới nhất), đặt vào `GITHUB_RELEASE\` và thư mục gốc để thay thế phiên bản zip trước đó khi phát hành GitHub Release.

---

## 3. 📜 BƯỚC 3: THÊM LỊCH SỬ PHÁT TRIỂN VÀO OVERVIEW (RELEASE NOTES)
* **Đường dẫn tệp tin**:
  - `C:\Users\DELL\Documents\Modding\browser\GITHUB_RELEASE\VOCAFLOW_OVERVIEW.txt`
  - `C:\Users\DELL\Documents\Modding\browser\VOCAFLOW_OVERVIEW.txt`
* **Công việc cụ thể**:
  1. Cập nhật số hiệu Version & Build ở đầu tệp (Ví dụ: `v0.10.8-released (Build 226 - Debug 0.4)`).
  2. Thêm chi tiết các tính năng mới, lỗi đã sửa, cải tiến kiến trúc vào mục `II. LỊCH SỬ PHÁT TRIỂN & CHI TIẾT CÁC BẢN CẬP NHẬT`.
  3. Đồng bộ nội dung giữa 2 file `VOCAFLOW_OVERVIEW.txt` (ở gốc và trong `GITHUB_RELEASE`).

---

## 4. 🔄 BƯỚC 4: ĐỒNG BỘ 2 CHIỀU DỮ LIỆU NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP (TWO-WAY CLOUD SYNC)
* **Công việc cụ thể**:
  - Luôn đảm bảo cơ chế đồng bộ 2 chiều (Pull from Cloud -> Merge -> Push to Cloud) hoạt động thông suốt và an toàn cho tất cả dữ liệu:
    1. **Kinh tế & Ví (Economy & Wallet)**: `points` (Xu), `hints` (Gợi ý AI), `skips` (Lượt bỏ qua), `luckySpins` (Lượt quay), `flowFreezes` / `streakFreezes` (Băng bảo vệ chuỗi), `userLedger` (Sổ cái giao dịch).
    2. **Hồ sơ & Xác thực (Auth & Profile)**: `displayName`, `username` (Handle @), `bio`, `avatar`, `avatarTime`, `isVip`, `vipTier`, `vipExpiresAt`, `referredBy`, `achievements`, `pinnedBadges`.
    3. **Học tập & Tiến độ (Study & Progress)**: `decks` (Bộ từ), `words` (Từ vựng), `flowDates` (Lịch sử chuỗi học), `flowFreezeDates` (Ngày dùng Freeze), `deletedWordIds` / `deletedDeckIds` (Tombstones xóa dữ liệu).
    4. **Cộng đồng & Thông báo (Social & Notifications)**: `following`, `followers`, `notifications`, `deletedNotificationIds`, `purchasedDeckIds`.
    5. **Cài đặt & AI Quota**: `settings` (Âm lượng, Meme mèo, Bộ lọc), `aiChatQuota` (Hạn ngạch AI Mentor), `geminiApiKeys` (Bể khóa API).

---

## 🛡️ NGUYÊN TẮC BẢO TOÀN SOCIAL GRAPH (FOLLOWERS & FOLLOWING)
> ⚠️ **ĐẶC BIỆT LƯU Ý - TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM MẤT HOẶC RESET VỀ 0 SỐ FOLLOWERS / FOLLOWING:**
1. **Nguồn chân lý Followers là Cloud do cộng đồng đóng góp**: Danh sách `followers` của một người dùng do các người dùng khác ghi vào (`/users/{uid}/followers/{followerUid}`). Không bao giờ được dùng mảng rỗng `followers: {}` của một thiết bị mới để ghi đè làm mất followers trên Cloud.
2. **Hợp nhất 2 chiều (Bidirectional Union Merge)**: Khi pull từ Cloud hoặc local, luôn sử dụng toán tử hợp nhất `{ ...myFollowingMap, ...cloudData.following }` và `{ ...myFollowersMap, ...cloudData.followers }`.
3. **Bảo vệ chỉ số đếm (Non-Decreasing / Non-Zero Counter Protection)**:
   ```javascript
   currentUser.followingCount = Math.max(Object.keys(myFollowingMap).length, cloudFollowingCount, currentUser.followingCount || 0);
   currentUser.followerCount = Math.max(Object.keys(myFollowersMap).length, cloudFollowerCount, currentUser.followerCount || 0);
   ```
4. **Không push đè `followers` khi mảng rỗng**: Chỉ cập nhật node `followers` khi `Object.keys(myFollowersMap).length > 0` để tránh xóa dữ liệu người theo dõi thực tế trên Firebase RTDB.

---

## 🚀 LỆNH TỰ ĐỘNG ĐẨY CODE LÊN GITHUB
- Nhấp đúp vào `GITHUB_RELEASE\1_DAY_CODE_LEN_GITHUB.bat` hoặc chạy `GITHUB_RELEASE\push_github.ps1` để tự động đóng gói ZIP, commit và push lên repository `iamjulies/VocaFlow`.
