# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-36 (Build 268)`  
> **Cập nhật lần cuối:** 2026-09-09  
> **Trạng thái:** 🚀 **ĐANG LẮP GHÉP, BIÊN DỊCH VÀ PHÁT HÀNH**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-36 Build 268)

- [x] **Khắc Phục Triệt Để Gửi Mail Trực Tiếp Từ Form Ứng Dụng Về Gmail Quản Trị:**
  - **Nguyên nhân**:
    1. Cổng FormSubmit bắt buộc phải có các trường khóa chuẩn: `name`, `email` (dùng làm Reply-To), `message`, `_subject`. Ở bản trước, `emailPayload` chỉ chứa các trường tiếng Việt tùy biến nên bị FormSubmit tự động lọc/hủy vì coi là spam/form thiếu thông tin.
    2. Trên bản Windows Desktop App (EXE WebView2 chạy `file:///`), trình duyệt không gửi header `Origin: https://...` khiến FormSubmit từ chối yêu cầu từ file HTML cục bộ.
  - **Giải pháp toàn diện**:
    1. **Chuẩn hóa Payload**: Cung cấp đầy đủ các khóa chuẩn `name`, `email`, `message`, `_subject`, `_captcha: 'false'`, `_template: 'table'`, `_cc: 'nongduchaolop6c@gmail.com'` cùng các trường thông tin học viên chi tiết.
    2. **Native C# WebView2 WebMessage Bridge**: Bổ sung cơ chế `window.chrome.webview.postMessage` trong JavaScript và bộ thu `WebMessageReceived` trong C# `Program.cs`. Ứng dụng Desktop sẽ dùng `.NET HttpClient` gửi trực tiếp với header `Origin: https://iamjulies.github.io` hợp lệ 100%, gửi email thẳng vào Gmail không phụ thuộc vào trình duyệt hay hạn chế file local.
    3. **Đa kênh gửi dự phòng**: Song song gửi qua C# Desktop Bridge, Fetch AJAX trực tiếp, Hidden Form POST và nút Mở Web Gmail 1-Click.

- [x] **Đồng Bộ Phiên Bản v0.10.9-36 (Build 268) Trên Toàn Bộ 7 Vị Trí:**
  - `src/components/header.html` (`v0.10.9-36`)
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-36 (Build 268)`)
  - `src/scripts/app.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-36'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-36 (Build 268)'`)
  - `sw.js` (`v0.10.9-36`, `vocaflow-pwa-v0.10.9-36`)
  - `pubspec.yaml` (`version: 0.10.9+268`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-36`)
  - `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/push_github.ps1` (`v0.10.9-36`)
