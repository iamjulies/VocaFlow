# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-47 (Build 348)`  
> **Cập nhật lần cuối:** 2026-09-20  
> **Trạng thái:** 🚀 **ĐANG TIẾN HÀNH BUILD, KIỂM THỬ TỰ ĐỘNG & MULTI-DEPLOY GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-47 Build 348)

- [x] **Sửa Lỗi Tách Rời Tọa Độ Khung VIP Khi Rê Chuột (`src/styles/app.css`, `src/scripts/modules/13-wardrobe.js` - Vấn đề 21)**:
  - Khắc phục triệt để lỗi khi hover vào Khung VIP Tháng và VIP Năm, các chi tiết vương miện, cánh thiên thần bị bay lệch góc hoặc biến dạng tọa độ do CSS animation ghi đè `transform` của SVG.
  - Bọc các chi tiết động vào nhóm `<g>` con bên trong, cấu hình `transform-box: fill-box; transform-origin: center center;` giữ nguyên tọa độ định vị gốc `<g transform="...">` bên ngoài.
- [x] **Sửa Lỗi Thẻ Huy Hiệu Nổi Bật Vàng & Kim Cương (`src/styles/app.css` - Vấn đề 22 / Ảnh 141655.png, Ảnh 141815.png)**:
  - Triệt tiêu hoàn toàn quầng sáng xanh/cyan rực rỡ phía sau thẻ Kim Cương, đưa về viền sáng bạc/bạch kim tinh tế và nền mờ sang trọng.
  - Sửa lỗi hover thẻ Vàng bị biến thành mảng đen/trống; thay thế bằng lớp phủ ánh vàng kim chuyển màu êm dịu, giữ nguyên chữ và biểu tượng.
  - Khắc phục lỗi biểu tượng huy hiệu Vàng bị biến thành bóng đơn sắc vàng bằng cách phân lập phạm vi áp dụng gradient text của `.tier-gold` chỉ trong `.vf-name-wrapper`.
- [x] **Mở Rộng Không Gian Giao Diện Tủ Đồ Cá Nhân (`src/components/modals/modal-wardrobe.html`, `src/styles/app.css` - Vấn đề 23)**:
  - Mở rộng chiều rộng modal Tủ Đồ lên `max-width: 960px; width: 95vw;` kết hợp lưới hiển thị đa cột `minmax(280px, 1fr)`.
  - Giúp việc duyệt tìm, xem thử và quản lý hàng chục khung viền, hiệu ứng tên trở nên trực quan, thoáng đãng và tiện lợi.
- [x] **Tái Thiết Kế Đỉnh Cao 3 Cấp Độ Khung VIP (`src/scripts/modules/13-wardrobe.js`, `src/styles/app.css` - Vấn đề 24)**:
  - VIP Tháng (`vip_monthly`): Vòng kim loại hoàng kim thanh lịch với vương miện nhỏ ở góc 12h; khi rê chuột kích hoạt hiệu ứng nhấp nháy ánh vàng tinh xảo (`vipMonthlyBlink`).
  - VIP Năm (`vip_yearly`): Vương miện hoàng gia 3D khảm ngọc ruby và đôi cánh thiên thần uốn lượn; hoạt họa đập cánh mượt mà không lệch tọa độ (`royalWingPulse`).
  - VIP Trọn Đời (`vip` / `vip_lifetime`): Vòng năng lượng Tinh Vân Tím Huyền Bí với vương miện pha lê vũ trụ, cổ ngữ phát sáng và các hạt bụi sao lấp lánh; khi rê chuột tỏa ánh sáng quang phổ ma thuật lung linh (`vipMagicalGlisten`).
- [x] **Tối Ưu Hiệu Năng Modal Bảng Giá VIP Chống Giật Lag (`src/styles/app.css` - Vấn đề 25)**:
  - Bổ sung `transform: translateZ(0); will-change: transform;` và `contain: paint layout;` cho `.vip-pricing-modal` và các thẻ gói VIP.
  - Đảm bảo mở modal mượt mà 60 FPS, không còn hiện tượng tụt khung hình khi render hoạt họa gradient và hiệu ứng viền.
- [x] **Chuẩn Hóa Kích Thước Avatar Hồ Sơ & Bỏ Quầng Sáng Vàng Ngoài Cùng (`src/styles/app.css`, `src/components/modals/modal-profile.html`, `src/scripts/modules/03-auth.js` - Vấn đề 26 / Ảnh 143958.png)**:
  - Xóa bỏ hoàn toàn quầng sáng vàng tròn bao quanh khung avatar trong Modal Hồ Sơ Cá Nhân (`/me`) và Hồ Sơ Công Khai (`/u/:uid`).
  - Tăng tỷ lệ hiển thị khung viền và avatar lên chuẩn `100px` (khung chứa `104px`), cho hình ảnh avatar sắc nét, nổi bật và cân đối hoàn hảo.
- [x] **Đồng Bộ Toàn Diện Hiệu Ứng Tên Trên Mọi Vị Trí Của Ứng Dụng (`src/scripts/modules/*.js` - Vấn đề 27)**:
  - Rà soát và áp dụng hàm `renderUsernameWithEffectHtml()` trên toàn bộ các thành phần: Header máy tính/điện thoại, Hồ sơ cá nhân, Hồ sơ công khai, Danh sách tác giả VocaLib, Danh sách lớp học Admin, Thẻ VocaDeck, Tiêu đề chi tiết VocaDeck, Bình luận & Thảo luận Cộng đồng, Danh sách Bug Bounty.
- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-47 Build 348`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-46 Build 347)

- [x] **Sửa Lỗi Tách Rời Khối Pha Lê Khung Kim Cương Khi Rê Chuột (`src/styles/app.css`, `src/scripts/modules/13-wardrobe.js` - Issue 16 / Ảnh 133753.png)**:
  - Khắc phục triệt để lỗi khi hover vào Khung Kim Cương, viên pha lê góc trên bên phải bị bay lệch lên góc trên cùng bên trái.
  - Tách nhóm tọa độ SVG và nhóm hoạt họa CSS bằng cách bọc đa giác pha lê vào thẻ `<g class="diamond-star-glint">` bên trong, cấu hình `transform-box: fill-box; transform-origin: center center;` để co giãn tại tâm viên ngọc.
- [x] **Tách Biệt Emoji Khỏi Gradient Hiệu Ứng Tên (`src/styles/app.css`, `src/scripts/modules/13-wardrobe.js` - Issue 17 / Ảnh 133927.png)**:
  - Tách tất cả emoji (🎉, 🎂, ❄️, 🔔, 🎃, 🦇, ⭐, 🇻🇳, 🧧, 🌸, 🐰, 🥚, 🐾, 🦴) ra ngoài thẻ `<strong>` và bọc trong `<span class="vf-name-icon">` với `-webkit-text-fill-color: initial; color: initial;`, bảo toàn trọn vẹn màu sắc biểu cảm gốc và chống nhòe gradient.
- [x] **Chuẩn Hóa Hiệu Ứng Tên Mặc Định Trắng Sáng (`src/scripts/modules/13-wardrobe.js` - Issue 18 / Ảnh 134034.png)**:
  - Loại bỏ việc tự động ép hiệu ứng gradient vàng của VIP khi người dùng đã chọn phong cách "Mặc định". Trả về định dạng văn bản màu tiêu chuẩn (`color: var(--text)`).
- [x] **Đồng Bộ Khung Viền & Hiệu Ứng Tên Trong Danh Sách Người Theo Dõi & Đang Theo Dõi (`src/scripts/modules/03-auth.js` - Issue 19 / Ảnh 134132.png)**:
  - Nâng cấp modal danh sách người theo dõi (`modal-subscribers-list` / `openSubscribersListModal`), render avatar bằng `renderAvatarWithFrameHtml()` và username bằng `renderUsernameWithEffectHtml()` theo đúng tủ đồ của từng tác giả.
- [x] **Đồng Bộ Toàn Diện Tủ Đồ & Lưu Trữ Đám Mây Đa Thiết Bị (`src/scripts/modules/03-auth.js` - Issue 20)**:
  - Đồng bộ hóa bài viết Cộng đồng (`community-post-card`), bình luận (`renderSingleCommentHtml`), hồ sơ công khai (`openPublicProfileModal`), và trang cá nhân.
  - Bổ sung cơ chế Two-Way Sync cho `equippedWardrobe` và `unlockedWardrobeItems` trong `mergeCloudDataIntoLocal`, khôi phục tự động khi đăng nhập và dọn dẹp sạch sẽ khi đăng xuất.

- [x] **Shop Bán Khung Viền & Hiệu Ứng Tên Thẩm Mỹ (`src/components/modals/modal-wardrobe.html`, `src/scripts/modules/13-wardrobe.js`)**:
  - Gồm 3 ngăn: Khung Viền (Avatar Frames), Hiệu Ứng Tên (Name Effects), Danh Xưng (Titles).
  - Tự động mở khóa theo Cấp Độ (Level 1, 10, 20, 30, 40, 50).
  - Hộp Hero Live Preview Box xem trước trang bị thời gian thực trước khi quyết định.
- [x] **Hiệu Ứng Hoạt Họa & Vector Frames Độc Quyền (`src/styles/app.css`)**:
  - Khung viền: Rồng Thần Thoại Mythic (Hào quang Plasma Rồng), Kim Cương Diamond (Glow Neon & Sweep Light), Hoàng Kim Gold, Ánh Bạc Silver, Đồng Bronze.
  - Hiệu ứng tên: Mythic Cyberpunk Double Glitch & Flame Wave, Diamond Neon Sweep, Gold Sparkles Blink, Silver Metallic, Bronze.
- [x] **Trang Bị & Đồng Bộ Hai Chiều Realtime Cloud Sync (`13-wardrobe.js`, `03-auth.js`)**:
  - Quản lý `equippedWardrobe: { frame, nameEffect, title }` trong `localStorage` và Firebase Realtime Database.
  - Tự động render Drop-in trên Header, Modal Hồ Sơ Cá Nhân (`/me`) và Modal Hồ Sơ Công Khai (`/u/:uid`).
- [x] **Nút Truy Cập Tủ Đồ Nhanh (`src/components/header.html`, `src/components/modals/modal-profile.html`, `01-router.js`)**:
  - Thêm menu Tủ Đồ trong 3-dots dropdown Header và nút "✨ Tủ Đồ" trong Profile Modal.
  - Định tuyến URL `/wardrobe`, `/me/wardrobe`, `/tudo`.
- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-41 Build 342`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-41 (Build 342)`)
  - `src/scripts/modules/01-router.js` - `13-wardrobe.js` (`v0.10.10-41 Build 342`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-41'`, `VOCAFLOW_APP_BUILD = 342`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.10-41`)
  - `pubspec.yaml` (`version: 0.10.10+342`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-41`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-41 (Build 342)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-40 Build 341)

- [x] **Hệ Thống Lên Cấp 100% Bằng Điểm Rèn Luyện (Study EXP) (`src/scripts/modules/02-state-core.js`)**:
  - Tự động lên cấp dựa trên tổng Điểm Rèn Luyện (Study EXP) tích lũy vĩnh viễn (`getUserStudyExp()`), không bao giờ trừ VoCoin.
  - Công thức bậc 2 chuẩn hóa: $EXP_{\text{cần}}(L) = 150 \times L + 25 \times L^2$; $TotalEXP(N) = 75(N-1)N + \frac{25(N-1)N(2N-1)}{6}$.
- [x] **Cơ Cấu Quà Tặng Lên Cấp & Mốc VIP Tròn (`02-state-core.js`, `modal-level-up.html`)**:
  - Cấp thường ($L < 50$): Nhận $L \times 25\text{ VoCoin}$, xen kẽ $+1\text{ VocaHint}$ (chẵn) hoặc $+1\text{ VocaSkip}$ (lẻ), hiệu ứng pháo hoa Canvas + SFX.
  - Mốc tròn (10, 20, 30, 40, 50): Thưởng VIP (+2, +4, +6, +8, +10 ngày) cộng dồn nối tiếp (hoặc quy đổi $250\text{ VoCoin}$/ngày cho VIP Trọn Đời) + $200 \to 3000\text{ VoCoin}$ + VocaSpin / FlowFreeze.
- [x] **Max Level 50 & Rương Danh Dự Prestige Honor Chest (`02-state-core.js`)**:
  - Giới hạn Max Level 50. Mỗi $+50.000\text{ EXP}$ sau mốc cấp 50 tự động mở 1 Rương Danh Dự ($+400\text{ VoCoin} + 2\text{ VocaSpin}$).
- [x] **Giao Diện Level Pill & Thẻ Cấp Độ Hồ Sơ (`header.html`, `modal-profile.html`, `app.css`)**:
  - Header tích hợp Level Pill badge tương tác và icon rank động theo bậc (Tập sự, Đồng, Bạc, Vàng, Kim Cương, Đại Kiện Tướng).
  - Modal Hồ Sơ tích hợp thẻ Cấp độ & Điểm Rèn Luyện với thanh tiến trình EXP thời gian thực và xem trước phần thưởng cấp tiếp theo.
- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency & Multi-Deploy (`v0.10.10-39 Build 340`)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-39 (Build 340)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-39 (Build 340)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-39 (Build 340)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-39 Build 340`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-39'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-39 (Build 340)'`, `VOCAFLOW_APP_BUILD = 340`)
  - `src/scripts/modules/03-auth.js` (`v0.10.10-39 Build 340` & What's new registry)
  - `src/scripts/modules/04-decks-manager.js` - `12-achievements.js` (`v0.10.10-39 Build 340`)
  - `sw.js` & `Release_App/sw.js` (`vocaflow-pwa-v0.10.10-39`)
  - `pubspec.yaml` (`version: 0.10.10+340`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.10-39`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-39 (Build 340)`)
  - `VOCAFLOW_OVERVIEW.txt`

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-38 Build 339)

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