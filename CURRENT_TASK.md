# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-10 (Build 311)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** ✅ **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-10 Build 311)

- [x] **Issue 6 (Ghi Nhận Thời Gian Học & Thống Kê Spaced Repetition Cho Writing Lab)**:
  - Ghi nhận thời gian học thực tế mỗi phiên: `addDailyStudySeconds(durationSec, 'writing')`.
  - Ghi nhận hành động vào Study Flow (`recordStudyFlowAction('writing')`) và hoàn thành bài học (`recordLessonCompleted('writing')` trong `08-wallet-economy.js`).
  - Ghi nhận ôn tập từ vựng ngắt quãng Spaced Repetition cho tất cả các từ trong phiên (`recordStudySessionWordReviews(reviewedWords)`).
  - Quyết toán thưởng VoCoin / Xu công bằng qua cơ chế Balance v3 (`calculateSessionFinalPointsV3`), ghi sổ cái `STUDY_WRITING` và đồng bộ tức thì lên Cloud.

- [x] **Issue 7 (Tái Cấu Trúc Cấp Độ Thử Thách & Bổ Sung Cấp Độ Siêu Khó Expert x4.0)**:
  - Cấp độ Dễ (Easy): 1 từ đơn lẻ, tự do độ dài, hiển thị nghĩa tiếng Việt, điểm sàn 70, x1.0 (+8~16 Xu).
  - Cấp độ Trung bình (Medium): 2-3 từ liên kết, tự do độ dài, hiển thị nghĩa tiếng Việt, điểm sàn 80, x1.8 (+25~45 Xu).
  - Cấp độ Khó (Hard): 2-4 từ kết hợp, đoạn văn ngắn-vừa với ràng buộc linh hoạt (15-35 từ), hiển thị nghĩa tiếng Việt, điểm sàn 90, x2.8 (+55~90 Xu).
  - Cấp độ Siêu Khó (Super Hard / Expert): 2-5 từ nâng cao, đoạn văn vừa (30-65 từ), hiển thị nghĩa tiếng Việt, điểm sàn 95, x4.0 (+85~150 Xu).
  - Tự động bảo vệ và yêu cầu đăng nhập đối với các cấp độ từ Trung bình trở lên.

- [x] **Issue 8 (Đồng Bộ 2 Chiều Tuyệt Đối Cho Trình Độ Hiện Tại & Mục Tiêu Band)**:
  - Đảm bảo đồng bộ 2 chiều toàn diện giữa Local Database và Cloud Realtime Database cho cả `currentBand` và `targetBand`.
  - Ghi trực tiếp vào root `/users/${uid}/currentBand.json` và `/users/${uid}/targetBand.json` qua `saveUserProfileCustomFields()`.
  - Tự động nạp, gộp và cập nhật đồng bộ qua `pushCurrentDatabaseToCloud()` và `mergeCloudDataIntoLocal()`.

- [x] **Issue 9 (Bổ Sung Bản Dịch Tiếng Việt Cho Polished Rewrite & Nâng Cấp Định Dạng Nhận Xét)**:
  - Bổ sung trường `polishedRewriteVi` trong phản hồi Gemini AI và hiển thị thẻ dịch nghĩa tiếng Việt trực quan ngay bên dưới câu viết lại tiếng Anh (`#writing-polished-translation-vi`).
  - Định dạng Markdown Bold (`**...**`) trong nhận xét AI Mentor Feedback (`#writing-feedback-text`) với màu sắc nổi bật rõ nét (`#38bdf8`) và ngắt dòng tự nhiên.
  - Nâng cấp Thẻ Ghi Chú Ngữ Pháp (`#writing-grammar-card`) thành một thẻ chuyên biệt, hiển thị từng quy tắc ngữ pháp dưới dạng gạch đầu dòng rõ ràng, tương phản cao.

- [x] **Issue 10 (Thiết Lập Persona Giám Khảo Bản Ngữ IELTS Khắt Khe Tuyệt Đối & Chấm Điểm Không Khoan Nhượng)**:
  - Persona Examiner: Giám khảo bản ngữ chấm IELTS Writing Task 2 chuyên nghiệp, công tâm và không nể nang/không điểm thương hại (zero pity points).
  - Phạt nghiêm khắc các lỗi ngữ pháp cơ bản (thì động từ, hòa hợp chủ vị, mạo từ, giới từ, dấu câu, chính tả). Bất kỳ câu nào dính lỗi ngữ pháp căn bản đều bị hạ điểm dưới mức điểm sàn (<70) bất kể từ vựng trau chuốt.
  - Kiểm soát nghiêm ngặt việc sử dụng đầy đủ các từ vựng bắt buộc và giới hạn độ dài số lượng từ theo từng cấp độ.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-10 Build 311)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-10 (Build 311)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-10 Build 311`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-10'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-10 (Build 311)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` & `GITHUB_RELEASE/VocaFlow_Windows_App/sw.js` (`vocaflow-pwa-v0.10.10-10`)
  - `pubspec.yaml` (`version: 0.10.10+311`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-10`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-10_Windows_Portable.zip`, commit `feat: Release v0.10.10-10 (Build 311)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-10 (Build 311)`)