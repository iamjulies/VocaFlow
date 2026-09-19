# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-37 (Build 338)`  
> **Cập nhật lần cuối:** 2026-09-19  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH BUILD, KIỂM THỬ CDP & MULTI-DEPLOY GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-37 Build 338)

- [x] **Vấn đề 14: Tùy Chỉnh Số Ngày VocaVIP TRY Trong Sửa Ví (`modal-profile.html`, `03-auth.js`)**:
  - Bổ sung tùy chọn `custom_try` và container `#adjust-wallet-vip-custom-days-container` với các nút preset (3, 7, 14, 30 ngày) và ô nhập tùy biến.
  - Xử lý gán tag `✨ VocaVIP TRY` và tính toán `vipExpiresAt` chính xác trong `saveAdjustStudentWalletCloud()`.

- [x] **Vấn đề 15: Phát Hành Coupon Code & Chiến Dịch Sale Day Trên Cổng Quản Trị (`modal-publisher.html`, `modal-vip-pricing.html`, `03-auth.js`, `08-wallet-economy.js`, `02-state-core.js`)**:
  - *Coupon Codes*: Tab quản trị phát hành mã giảm giá đa dạng (%/VNĐ, hạn mức, thời hạn, 1 lần/học viên), lưu trữ Cloud RTDB `/coupon_codes/${code}.json`, bảng quản lý mã Cloud Realtime.
  - *VocaVIP Checkout Coupon*: Ô nhập mã coupon trên Bảng Giá VIP, kiểm tra hợp lệ, chiết khấu và tự động tạo lại VietQR, lưu lịch sử `/user_coupons/${uid}/${code}.json`.
  - *Chiến Dịch Sale Day Toàn Sàn*: Tạo/bật/tắt campaign giảm giá toàn sàn Flash Sale trên Cloud `/active_sale_campaign.json`, banner thông báo rực rỡ và áp dụng giảm giá toàn diện VocaShop & Bảng Giá VIP.

- [x] **Vấn đề 16: Gọn Gàng Thẻ VoCoin Trên Dashboard Quản Lý Flower (`modal-publisher.html`)**:
  - Rút gọn thẻ VoCoin chỉ hiển thị `💰 Tổng VoCoin: X VoCoin`, loại bỏ chuỗi giải thích dài dòng.

- [x] **Vấn đề 17: Bộ Lọc Nhanh Dạng Pill Cho Danh Sách Flower (`modal-publisher.html`, `03-auth.js`)**:
  - 3 nút pill `Tất cả`, `👑 VIP`, `🆓 Free` kèm số lượng đếm tự động dưới ô tìm kiếm để lọc nhanh danh sách Flower tức thì.

- [x] **Vấn đề 18: Hiển Thị Mốc Hết Hạn VIP Trực Tiếp Trên Thẻ Học Viên (`03-auth.js`)**:
  - Hiển thị badge `⏳ Hạn: DD/MM/YYYY (còn X ngày)` hoặc `(Vĩnh viễn)` / `(Đã hết hạn)` ngay dưới huy hiệu VIP trên thẻ học viên.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-37 Build 338`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-37 (Build 338)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-37 (Build 338)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-37 (Build 338)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-37 Build 338`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-37'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-37 (Build 338)'`, `VOCAFLOW_APP_BUILD = 338`)
  - `src/scripts/modules/03-auth.js` (`v0.10.10-37 Build 338` & What's new registry)
  - `src/scripts/modules/05-quiz-engine.js` - `08-wallet-economy.js` (`v0.10.10-37 Build 338`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.10-37`)
  - `pubspec.yaml` (`version: 0.10.10+338`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-37`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-37 (Build 338)`)
  - `VOCAFLOW_OVERVIEW.txt`

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-36 Build 337)

- [x] **Vấn đề 7: Hoàn Thiện Kết Toán Điểm Thống Nhất Toàn Diện Cho Luyện Nói & Viết Câu (`07-speaking-engine.js`, `06c-writing-engine.js`)**:
  - Khắc phục triệt để lỗi thiếu kết toán số dư ví VoCoin (`setUserPoints`, `addLedgerEntry`) và Điểm Rèn Luyện (`addStudyExp`) trong `finishSpeakingSession()` và `finishWritingSession()`.
  - Bảo vệ an toàn chống kết toán trùng lặp khi người dùng bấm nút thoát sớm sau khi đã hiển thị modal tổng kết.
  - Sửa lỗi typo sự kiện thành tích `recordLessonCompleted('speaking')`.

- [x] **Vấn đề 8: Cảnh Báo Hết Hạn VIP Tự Động Trong VocaNoti (`02-state-core.js`, `app.js`, `12-achievements.js`)**:
  - Triển khai `checkAndTriggerVipExpirationWarning()` tự động kiểm tra thời hạn thuê bao VocaVIP.
  - Khi thời gian VIP còn lại $\le 24\text{h}$ (`remainingMs > 0 && remainingMs <= 86400000`), hệ thống tự động phát thông báo khẩn cấp (`VIP_EXPIRING`) kèm thời gian đếm ngược trực quan và nút mở trực tiếp bảng giá gia hạn VocaVIP.
  - Cơ chế lọc trùng lặp theo mốc ngày hết hạn (`lastExpWarningDate`) tránh gửi thông báo lặp lại phiền hà.

- [x] **Vấn đề 9: Dịch Thuật Song Phương Ngẫu Nhiên 50/50 (Random Direction - `modal-translation-setup.html`, `06f-translation-engine.js`)**:
  - Bổ sung nút chọn chiều "🔀 Ngẫu Nhiên" vào `modal-translation-setup.html` bên cạnh "Anh ➔ Việt" và "Việt ➔ Anh".
  - Trong `06f-translation-engine.js`, khi chọn chế độ Ngẫu Nhiên, mỗi câu hỏi được tự động gán ngẫu nhiên 50% câu hỏi là Anh ➔ Việt và 50% câu hỏi là Việt ➔ Anh.
  - Cập nhật huy hiệu thanh tiêu đề, nhãn yêu cầu câu hỏi và modal kết quả hiển thị linh hoạt theo từng chiều câu hỏi.

- [x] **Vấn đề 10: Tự Động Thu Hồi Hiệu Ứng VIP Hết Hạn (`03-auth.js`)**:
  - Rà soát và loại bỏ triệt để hiệu ứng hào quang vàng, vương miện hoàng gia 👑 và huy hiệu VIP khi tài khoản hết hạn trên Publisher Portal (`fetchAdminStudentsList`, `renderAdminStudentsTable`), Bảng xếphp và Hồ sơ công khai (`openPublicProfileByAuthor`).

- [x] **Vấn đề 11: Phân Cấp Gói Trải Nghiệm "✨ VocaVIP TRY" (`02-state-core.js`, `03-auth.js`, `10-lucky-wheel.js`, `08-wallet-economy.js`)**:
  - Thiết lập cấp độ tier `'try'` riêng biệt cho các trường hợp nhận VIP miễn phí qua Vòng quay may mắn (`grantVipDaysBonus`) và Mã giới thiệu tân thủ.
  - Hiển thị nhãn huy hiệu "✨ VocaVIP TRY" phân biệt với các gói trả phí chính thức (Monthly, Yearly, Lifetime). Tự động thu hồi và gỡ bỏ khi hết hạn.

- [x] **Động Cơ Tính Điểm Rèn Luyện Thống Nhất (Unified Study EXP Engine - `02-state-core.js`)**:
  - Xây dựng hàm lõi `calculateUnifiedStudyExp(mode, sessionItems, totalExpectedCount, difficultyMultOrOptions)` áp dụng công thức toán học chuẩn xác cho cả 8 chế độ học:
    $$\text{FinalEXP} = \left\lfloor \left( \sum_{i=1}^{N_{\text{done}}} \text{BaseEXP} \times \text{QualityFactor}_i \right) \times W_{\text{mode}} \times M_{\text{diff}} \times \Phi(N_{\text{done}}) \times \Psi\left(\frac{N_{\text{done}}}{N_{\text{total}}}\right) \times M_{\text{VIP}} \times M_{\text{Flow}} \right\rfloor$$
  - Bảng trọng số chế độ $W_{\text{mode}}$: Auto Flashcard (0.2), Quiz (1.0), Spelling (1.3), Speaking (1.8), Dictation (2.4), Cloze (2.8), Translation (3.0), Writing (3.5).
  - Hệ số chất lượng $\text{QualityFactor}_i$: Điểm $< 60 \implies 0.10$ (phạt nặng đoán mò); Điểm $\ge 60 \implies (\text{score}/100)^2$.
  - Bảo toàn giá trị học thuật: Điểm Rèn Luyện (EXP) là điểm tích lũy học tập thực tế, **không bị áp trần Soft-Cap Năng Lượng Não Bộ (Brain Energy)** của đồng VoCoin.

- [x] **Tích Hợp Toàn Diện 8 Chế Độ Học & Bảng Kết Toán Modal (`05-quiz-engine.js` -> `07-speaking-engine.js`)**:
  - Tích hợp `calculateUnifiedStudyExp` và `addStudyExp` vào toàn bộ 8 chế độ học: Trắc nghiệm (Quiz), Luyện viết (Spelling), Luyện nói (Speaking), Auto Flashcard, Viết câu (Writing), Điền đoạn văn (Cloze), Nghe chép (Dictation), Dịch thuật (Translation).
  - Cập nhật 7 Modal Kết Quả và Modal Xác Nhận Thoát Sớm hiển thị đồng thời cả VoCoin nhận được và Điểm EXP nhận được.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-34 Build 335`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-34 (Build 335)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-34 (Build 335)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-34 (Build 335)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-34 Build 335`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-34'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-34 (Build 335)'`, `VOCAFLOW_APP_BUILD = 335`)
  - `src/scripts/modules/03-auth.js` (`v0.10.10-34 Build 335` & registry)
  - `src/scripts/modules/05-quiz-engine.js` - `07-speaking-engine.js` (`v0.10.10-34 Build 335`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.10-34`)
  - `pubspec.yaml` (`version: 0.10.10+335`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-34`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-34 (Build 335)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-33 Build 334)

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