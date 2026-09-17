# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-30 (Build 331)`  
> **Cập nhật lần cuối:** 2026-09-17  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH BUILD, KIỂM THỬ CDP & MULTI-DEPLOY GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-30 Build 331)

- [x] **Động Cơ Soft-Cap Logarit Trơn Điều Tiết Năng Lượng Não Bộ & Lạm Phát VoCoin (`02-state-core.js`, `03-auth.js`)**:
  - Triển khai công thức Soft-Cap logarit tự nhiên trơn tru:
    $$\eta(E_{\text{today}}) = \frac{1}{1 + \ln\left(1 + \frac{E_{\text{today}}}{K}\right)}$$
  - Hằng số bão hòa $K$: Free/Standard User = 350, VocaVIP User = 700.
  - Hàm tiện ích: `getTodayEarnedCoins()`, `recordTodayEarnedCoins(amount)`, `getDailyFatigueEfficiency()`.
  - Tích hợp vào `calculateSessionFinalPoints` và `calculateSessionFinalPointsV3` để điều tiết thưởng học tập (`finalPts = Math.max(1, Math.round(rawFinalPts * energyEfficiency))`).
  - Ghi nhận lịch sử học tập vào storage key `vocaflow_daily_study_coins_{YYYY-MM-DD}_{uid}` theo múi giờ GMT+7, tự động reset vào 00:00 hàng ngày.
  - Tự động tích lũy trong `addLedgerEntry` khi type là `STUDY_*` và `amount > 0`.

- [x] **Đồng Bộ Giao Diện Huy Hiệu Năng Lượng Tiếp Thu Não Bộ Trên 7 Chế Độ Học**:
  - Thuật ngữ tích cực & thân thiện: **"⚡ Năng Lượng Tiếp Thu Não Bộ (Brain Focus Energy)"**, tuyệt đối không dùng từ "Thuế" hay "Phạt".
  - Hiển thị thông báo năng lượng khi $\eta < 0.95$ (ví dụ: `⚡ Năng lượng tập trung: 72% (+X VoCoin)`).
  - Tích hợp `updateModalBrainEnergyIndicator` trên 7 Modal kết quả:
    + Trắc Nghiệm (`modal-quiz-result.html`, `05-quiz-engine.js`)
    + Chính Tả (`modal-spelling-result.html`, `06-spelling-engine.js`)
    + Luyện Nói AI (`modal-speaking-result.html`, `07-speaking-engine.js`)
    + Viết Câu AI (`modal-writing-result.html`, `06c-writing-engine.js`)
    + Điền Từ Cloze (`modal-cloze-result.html`, `06d-cloze-engine.js`)
    + Nghe Gõ Câu Dictation (`modal-dictation-result.html`, `06e-dictation-engine.js`)
    + Dịch Thuật Song Phương (`modal-translation-result.html`, `06f-translation-engine.js`)

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-30 Build 331`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-30 (Build 331)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-30 (Build 331)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-30 (Build 331)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-30 Build 331`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-30'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-30 (Build 331)'`)
  - `src/scripts/modules/03-auth.js` (`v0.10.10-30 Build 331`)
  - `src/scripts/modules/05-quiz-engine.js` - `06f-translation-engine.js` (`v0.10.10-30 Build 331`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-30`)
  - `pubspec.yaml` (`version: 0.10.10+331`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-30`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-30 (Build 331)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-29 Build 330)

- [x] **Vấn đề 7: Nâng Cấp Gợi Ý VocaHint Đa Tầng Thực Dụng Trong Dịch Thuật Song Phương (`06f-translation-engine.js`)**:
  - Khắc phục hoàn toàn việc gợi ý trùng lặp Target Word (từ vựng trọng tâm đã có sẵn trên huy hiệu `🎯 Từ vựng trọng tâm`).
  - **Kiểu 1 (Secondary Vocabulary)**: Bổ sung thuật toán `extractSecondaryVocabHint` bóc tách và dịch nghĩa các từ phụ/từ khó khác trong câu nguồn.
  - **Kiểu 2 (Collocation & Grammar Structure)**: Bổ sung gợi ý cụm từ kết hợp và cấu trúc ngữ pháp/thì câu.
  - **Kiểu 3 (Sentence Starter Framing)**: Gợi ý khung mở đầu câu tự nhiên trong ngôn ngữ đích.
  - **Kiểu 4 (Full Benchmark Translation & Polished Nuance)**: Bản dịch tham khảo hoàn chỉnh và gợi ý chữ cái mở đầu mặt nạ (Tầng 3).
  - Tối ưu 3 tầng gợi ý nấc thang trong `useTranslationHint()` tiêu tốn VocaHint hợp lý.

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-28 Build 329)

- [x] **Vấn đề 1: Nâng Cấp AI Chấm Bài Dịch Thuật & Heuristic Fallback (`06f-translation-engine.js`)**:
  - Chấm theo Độ Tương Đương Ngữ Nghĩa (Semantic Equivalence), Độ Trôi Chảy (Fluency) và Văn Phong Tự Nhiên.
  - Linh hoạt tuyệt đối với đại từ nhân xưng ("chúng tôi" / "chúng ta" / "nhóm mình"), trật tự từ tự nhiên ("thực sự là..." vs "là... thực sự") và các từ đồng nghĩa ngữ cảnh.
  - Tuyệt đối không trừ điểm oan hoặc cáo buộc sai "dịch word-by-word" khi người học dịch tự nhiên, đủ ý và đúng ngữ pháp.
  - Heuristic Fallback cải tiến: Bóc tách stopwords, kiểm tra độ phủ từ vựng ngữ nghĩa cốt lõi và tặng điểm thưởng cho bản dịch trọn vẹn (85-95đ).

- [x] **Vấn đề 2: Tích Hợp Màn Hình Cảnh Báo Thoát Giữa Chừng (`06f-translation-engine.js`, `02-state-core.js`)**:
  - Tích hợp modal cảnh báo thoát giữa chừng (`modal-study-exit-confirm`) cho Dịch Thuật Song Phương (VIP β).
  - Hiển thị tiến độ câu đã làm, số câu tổng và kết toán điểm thưởng theo chuẩn Balance v3 (Extended Lab β) trước khi rời màn hình.

- [x] **Vấn đề 3: Chuẩn Hóa Thuật Toán Sinh Câu Hỏi Dịch Thuật Ngữ Cảnh (`06f-translation-engine.js`)**:
  - Bổ sung hàm `extractCleanPrimaryMeaning(rawDefVi, term)` bóc tách toàn bộ chú thích ngoặc (ví dụ "(Wi-Fi, Bluetooth)") và từ bổ nghĩa dài dòng.
  - Phân loại từ vựng thành 5 miền ngữ cảnh chuyên biệt: Công nghệ/Thiết bị (Tech), Nhân cách/Tư duy (Personality), Học thuật/Nghiên cứu (Academic), Kinh doanh/Công sở (Business), Đời sống & Xã hội (General).
  - Đảm bảo 100% các câu hỏi sinh ra đều tự nhiên, chuẩn mực, loại bỏ triệt để các câu ngô nghê hoặc vô nghĩa.

- [x] **Ra mắt Chế độ Nghe Gõ Câu (Full Sentence Dictation VIP β - Luyện Kỹ Năng Listening)**:
  - Triển khai `06e-dictation-engine.js`, `screen-dictation.html`, `modal-dictation-setup.html`, `modal-dictation-result.html`.
  - Sinh câu văn tự nhiên theo 4 cấp độ (Dễ, TB, Khó, Siêu Khó).
  - Tích hợp điều tốc giọng đọc tự nhiên (0.5x - 1.25x), đệm an toàn âm thanh 250ms, và khóa cứng khi hết lượt nghe.
  - Thuật toán so khớp Levenshtein Token-by-Token Diff đối chiếu trực quan sinh động.
  - Tự động lưu từ sai vào Sổ Tay Lỗi Sai (`modal-mistake-notebook`).
  - Tắt phụt tiếng pháo hoa khi đóng modal kết thúc bài học.
  - Đồng bộ số lượng VocaHint & VocaSkip theo ví thực tế.
  - Phân quyền VIP độc quyền cho chế độ Nghe Gõ Câu.

- [x] **Vấn đề 20: Tối Ưu Hóa Giao Diện Deck Header Cho Thiết Bị Màn Hình Hẹp / Mobile (`app.css`, `screen-deck-detail.html`)**:
  - Bố trí lưới 2 cột gọn nhẹ cho `.study-modes-page` và tinh giản padding header, tiết kiệm >60% chiều cao dọc trên mobile.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-21 Build 322`)**:
  - Đồng bộ 11 file hệ thống sang `v0.10.10-21 (Build 322)`.

- [x] **Quy hoạch Chế độ Học tập & Đánh dấu Extended Learning Modes (β)**:
  - 4 Chế độ cốt lõi (Learning Modes): Luyện Nói (Speaking), Auto Flashcard, Chính Tả (Spelling), Trắc Nghiệm (Quiz).
  - 4 Chế độ mở rộng nâng cao (Extended Learning Modes β): Viết Câu (VIP β), Điền Từ (VIP β), Nghe Gõ Câu (VIP β - Sắp ra mắt), Dịch Thuật (VIP β - Sắp ra mắt).

- [x] **Vấn đề 17: Tự Động Đăng Bài & Phát Thông Báo Phát Sáng @official Định Kỳ Theo Build (`03-auth.js`)**:
  - Triển khai `VOCAFLOW_OFFICIAL_RELEASES_REGISTRY` chứa danh mục bài đăng cho tất cả các build (từ v0.10.10-14 đến v0.10.10-20).
  - Khi người dùng cập nhật lên build mới, hệ thống tự động kiểm tra `localStorage` và Firebase RTDB để tạo bài viết công bố từ `@official` nếu chưa có, đồng thời gửi thông báo hệ thống phát sáng tím (`isGlowing: true`).

- [x] **Vấn đề 18: Thanh Chọn Chế Độ Học Phân Trang 2 Lượt Cốt Lõi vs Mở Rộng (`screen-deck-detail.html`, `modal-review-queue.html`, `04-decks-manager.js`, `app.css`)**:
  - Tách header chế độ học dài thành 2 trang trượt:
    + Trang 1: 4 Chế độ cốt lõi + Nút `Nâng cao (β) ➡️` (`#btn-deck-study-page-next`).
    + Trang 2: Nút `⬅️ Cơ bản` (`#btn-deck-study-page-prev`) + 4 Chế độ mở rộng nâng cao (Viết Câu, Điền Từ, Nghe Gõ Câu, Dịch Thuật).
  - Trạng thái trang được lưu trong `localStorage.getItem('vocaflow_deck_study_mode_page')`.

- [x] **Vấn đề 19: Tái Thiết Kế Thẻ Giải Thích Điền Từ Đoạn Văn Cloze 3 Tầng Trực Quan (`06d-cloze-engine.js`, `app.css`)**:
  - Thay thế văn bản giải thích liền mạch bằng 3 thẻ (`.cloze-explanation-card`) có viền màu sắc và biểu tượng trực quan:
    + 🏛️ Vị Trí Ngữ Pháp & Cấu Trúc (`.cloze-card-grammar`)
    + 🔗 Cụm Từ & Collocation Cố Định (`.cloze-card-colloc`)
    + 💡 Sắc Thái Ngữ Cảnh & Ý Nghĩa (`.cloze-card-context`)
  - Tự động hiển thị huy hiệu thông báo cấu trúc song hành liên từ (and/or) hợp lệ.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-20 Build 321`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-20 (Build 321)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-20 (Build 321)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-20 (Build 321)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-20 Build 321`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-20'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-20 (Build 321)'`)
  - `src/scripts/modules/06d-cloze-engine.js` (`v0.10.10-20 Build 321`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-20`)
  - `pubspec.yaml` (`version: 0.10.10+321`)
  - `VocaFlow_Desktop/Program.cs` (`v0.10.10-20`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-20 (Build 321)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`