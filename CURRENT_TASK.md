# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-8 (Build 309)`  
> **Cập nhật lần cuối:** 2026-09-14  
> **Trạng thái:** ✅ **HOÀN TẤT KIỂM THỬ CDP & SẴN SÀNG XUẤT BẢN ĐA NỀN TẢNG (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-8 Build 309)

- [x] **Phân Loại Chế Độ Học (Core Learning Modes & Extended Learning Modes β)**:
  - **Learning Modes (Cốt lõi)**: 🎴 Thẻ Từ (Auto Flashcard), 📝 Trắc Nghiệm (Quiz), ✍️ Chính Tả (Spelling), 🎙️ Luyện Nói (Speaking Lab).
  - **Extended Learning Modes (Mở rộng β)**:
    1. ✍️ **Luyện Viết Câu / Đoạn Văn (Sentence Writing Lab β)** -> Triển khai hoàn chỉnh trong phiên bản này.
    2. 📖 **Cloze Test (Điền từ vào đoạn văn có bối cảnh β)** -> Kỹ năng Reading (Đã chuẩn bị kiến trúc và badge).
    3. 🎧 **Full Sentence Dictation (Nghe chép chính tả cả câu β)** -> Kỹ năng Listening (Đã chuẩn bị kiến trúc và badge).

- [x] **Động Cơ & Giao Diện Luyện Viết Câu (Sentence Writing Lab β) (06c-writing-engine.js & screen-writing.html)**:
  - **3 Cấp độ thử thách**:
    - 🟢 **DỄ (Easy)**: 1 từ bắt buộc, tự do độ dài câu, điểm sàn 70đ, hệ số x1.0 (+8 ~ 16 Xu/câu).
    - 🟡 **TRUNG BÌNH (Medium)**: 2 - 3 từ liên kết ngữ nghĩa, tự do độ dài, điểm sàn 80đ, hệ số x1.8 (+25 ~ 45 Xu/câu).
    - 🔴 **KHÓ (Hard / Mastery)**: 2 - 4 từ kết hợp, ràng buộc số lượng từ linh động (15 - 35 từ), điểm sàn 90đ, hệ số x2.8 (+55 ~ 90 Xu/câu).
  - **Thuật toán Thematic Word Association**: Tự động nhóm các từ có liên quan trong deck hoặc tự động bổ trợ từ vựng tự nhiên khi deck không đủ từ.
  - **Đánh giá hành văn đa tầng qua Gemini AI (Band 8.0+ Native Evaluator)**:
    - Chấm điểm (0 - 100) theo 4 Trụ Cột: Ngữ pháp, Từ vựng & Collocation, Mạch lạc tự nhiên, Độ dài & Quy tắc đề bài.
    - **Phiên bản viết lại chuẩn bản xứ (Polished Native Rewrite)** kèm nút phát âm audio mẫu.
    - Nhận xét chi tiết bằng tiếng Việt và ghi chú ngữ pháp nâng cao.
  - **Live Word Counter & Chip Highlighting**: Đếm số từ, ký tự trực tiếp theo thời gian thực và tự động phát sáng chip từ vựng khi người dùng gõ vào bài.
  - **Kinh tế phần thưởng & Sổ từ sai**: Điểm >= sàn -> Nhận thưởng VoCoin cao, tăng Mastery và gỡ khỏi từ sai. Điểm < sàn -> Thêm từ vào Sổ từ sai (`addWordToMistakeList(word, 'writing')`).
  - **VocaHint & VocaSkip**: Gợi ý cấu trúc câu và bỏ qua câu linh hoạt.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-8 Build 309)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-8 (Build 309)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-8 (Build 309)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-8 (Build 309)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-8 Build 309`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-8'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-8 (Build 309)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` & `GITHUB_RELEASE/VocaFlow_Windows_App/sw.js` (`vocaflow-pwa-v0.10.10-8`)
  - `pubspec.yaml` (`version: 0.10.10+309`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-8`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.10-8_Windows_Portable.zip`, commit `feat: Release v0.10.10-8 (Build 309)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.10-8 (Build 309)`)