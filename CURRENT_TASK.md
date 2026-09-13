# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-2 (Build 303)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH KIỂM THỬ VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-2 Build 303)

- [x] **Chuẩn Hóa Prompt AI Tự Động Điền Từ & Sáng Tạo Bộ Từ (Part-Of-Speech Discrimination Engine)**:
  - Khắc phục triệt để hiện tượng AI điền nghĩa tiếng Việt của danh từ (noun) bị trùng lặp hoặc trơ trọi như động từ (verb) mà không có thành tố phân biệt từ loại (ví dụ: từ `withdraw` [verb] có nghĩa "Rút tiền", trong khi từ `withdrawal` [noun] cũng bị AI dịch trơ thành "Rút tiền" thay vì "Sự rút tiền" hoặc "Khoản rút tiền" hoặc "Sự rút lui").
  - Nâng cấp toàn diện Prompt của hàm `fetchWordFromGemini` trong `06-spelling-engine.js` (AI Điền Tự Động & Đa Nét Nghĩa Polysemy) và `handleGenerateAiDeck` trong `04-decks-manager.js` (AI Deck Studio: Theo chủ đề, Trích xuất đoạn văn, Chuẩn hóa danh sách thô).
  - Thiết lập quy chuẩn bắt buộc phân biệt từ loại qua thành tố tiếng Việt:
    * DANH TỪ (Noun / Noun Phrase): Đối với danh từ chỉ hành động, quá trình, trạng thái, khái niệm trừu tượng (như withdrawal, development, negotiation, sadness...), BẮT BUỘC thêm tiền tố danh từ hóa như "Sự", "Việc", "Cuộc", "Quá trình", "Tình trạng", "Khoản", "Niềm", "Nỗi" (Ví dụ: `withdrawal` -> "Sự rút tiền", "Khoản rút tiền", "Sự rút lui", "Sự thu hồi"; `development` -> "Sự phát triển"; `negotiation` -> "Cuộc đàm phán"). Danh từ chỉ người/tác nhân thêm "Người", "Kẻ", "Nhà", "Chuyên gia", "Thợ". Danh từ chỉ dụng cụ/máy móc thêm "Máy", "Thiết bị", "Dụng cụ".
    * ĐỘNG TỪ (Verb / Phrasal Verb): Dùng trực tiếp động từ nguyên thể hành động ("Rút tiền", "Rút lui", "Thu hồi", "Phát triển", "Đàm phán"), tuyệt đối không thêm "sự" hay "việc".
    * TÍNH TỪ (Adjective): Thể hiện đặc điểm, tính chất ("Kiên cường", "Xinh đẹp", "Linh hoạt", "Dễ vỡ", "Thuộc tài chính").
    * TRẠNG TỪ (Adverb): Thể hiện cách thức, mức độ, thường thêm "Một cách..." ("Một cách cẩn thận", "Một cách lưu loát") hoặc phó từ mức độ ("Rất", "Hoàn toàn", "Thường xuyên").
  - Bảo đảm hàm làm sạch định nghĩa `cleanVietnameseDefinition` giữ nguyên vẹn 100% các thành tố từ loại này.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-2 Build 303)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-2 (Build 303)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-2 (Build 303)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-2 (Build 303)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-2 Build 303`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-2'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-2 (Build 303)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-2`)
  - `pubspec.yaml` (`version: 0.10.10+303`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-2`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-2_Windows_Portable.zip`, commit `v0.10.10-2 (Build 303)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-2 (Build 303)`)