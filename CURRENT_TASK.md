# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-56 (Build 288)`  
> **Cập nhật lần cuối:** 2026-09-12  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-56 Build 288)

- [x] **Chu Kì Hàng Đợi Ôn Tập SRS & Đếm Ngược Ngày Ôn Tiếp Theo (Review Queue Reset & Interval Engine)**:
  - Khi hoàn thành buổi học hoặc ôn tập các từ quá hạn (SRS Review Queue) qua bất kỳ chế độ học tập nào (Quiz, Spelling, Speaking, Auto Flashcard):
    + Hệ thống tự động ghi nhận mốc thời gian `lastReviewedAt = new Date().toISOString()`.
    + Cập nhật đồng bộ vào master state `words`, lưu trữ cục bộ và đồng bộ lên Firebase Cloud Realtime Database.
    + Tính toán lại chu kì ôn tập tiếp theo theo thuật toán ngắt quãng SRS (1 ngày -> 3 ngày -> 7 ngày -> 14 ngày -> 30 ngày).
    + Tự động đưa các từ đã học ra khỏi danh sách cần ôn trong ngày hôm nay kèm chỉ số đếm ngược trực quan (`🌱 Đã ôn hôm nay (lần tới: X ngày)`).

- [x] **Đánh Giá Khả Thi Tích Hợp AI Chấm Điểm Phát Âm Sâu (Wav2Vec2 Pronunciation Assessment)**:
  - Hoàn thành báo cáo phân tích kỹ thuật chuyên sâu về mô hình `moxeeeem/wav2vec2-finetuned-pronunciation-correction`:
    + Đánh giá kích thước mô hình (90MB - 360MB) so với mục tiêu ứng dụng siêu nhẹ 3MB Offline-First Web PWA / Windows WebView2.
    + Đề xuất kiến trúc Hybrid: Giữ vững Core Engine hiện tại (Gemini 2.0 Flash + Phonetic Confusion Set đa ngôn ngữ offline) làm mặc định mượt mà, sẵn sàng mở rộng tích hợp Hugging Face Serverless Inference API cho phân tích CTC Phoneme Alignment nâng cao.

- [x] **Hoàn Thiện Giao Diện Biểu Đồ 7 Ngày & 3 Thẻ Thống Kê (7-Day Performance Combo Chart & Stat Cards)**:
  - Sửa lỗi 3 dòng thống kê không đồng bộ CSS thành 3 thẻ chỉ số (Tổng Thời Gian, VoCoin Thu Được, Điểm Rèn Luyện) dạng lưới 3 cột hiện đại, sắc nét.
  - Thêm tooltip tương tác chi tiết khi di chuột / nhấp chuột vào từng thẻ (chi tiết ngày học nhiều nhất, phân tích số phút, tổng xu, tỷ lệ tiến độ).
  - Xóa bỏ triệt để dữ liệu mẫu giả lập (mock data) cho các ngày quá khứ chưa có hoạt động (giữ chuẩn 0 thay vì sinh số ngẫu nhiên).

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Windows Native (v0.10.9-56 Build 288)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-56 (Build 288)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-56 (Build 288)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-56 (Build 288)`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-56'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-56 (Build 288)'`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.9-56`)
  - `pubspec.yaml` (`version: 0.10.9+288`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-56`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-56_Windows_Portable.zip`, commit `v0.10.9-56 (Build 288)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-56 (Build 288)`)