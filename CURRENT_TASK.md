# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-55 (Build 356)`  
> **Cập nhật lần cuối:** 2026-10-03  
> **Trạng thái:** 🚀 **ĐÃ HOÀN THÀNH - ĐANG TIẾN HÀNH BUILD & MULTI-DEPLOY GITHUB**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-55 Build 356 - Khắc Phục Lỗi Chấm Điểm 0đ Azure Pronunciation Assessment & Chuẩn Hóa Bảng Phiên Âm IPA)

- [x] **Khắc Phục Lỗi Bóc Tách Điểm Số Azure REST API (`07-speaking-engine.js`)**:
  - **Nguyên nhân gốc rễ**: Khi gọi Azure Speech REST API với định dạng `detailed`, các chỉ số điểm số cốt lõi (`PronScore`, `AccuracyScore`, `FluencyScore`, `ProsodyScore`, `CompletenessScore`) nằm trực tiếp ở cấp cao nhất của `NBest[0]`, và điểm số từ/âm vị/âm tiết nằm trực tiếp tại `w.AccuracyScore`, `p.AccuracyScore`, `s.AccuracyScore`. Bộ phân tích trước đó đọc qua `nbest.PronunciationAssessment.PronScore` dẫn đến `undefined` -> trả về 0đ dù phát âm chuẩn xác 100%.
  - **Giải pháp**: Bổ sung cơ chế fallback đọc song song `nbest.PronScore ?? pron.PronScore ?? nbest.AccuracyScore ?? pron.AccuracyScore`, cũng như `w.AccuracyScore ?? w.PronunciationAssessment?.AccuracyScore` và `s.AccuracyScore`.

- [x] **Chuẩn Hóa Bảng Phiên Âm Sang Chuẩn Quốc Tế IPA (`07-speaking-engine.js`)**:
  - **Nguyên nhân**: Azure Speech mặc định dùng bảng ký hiệu `SAPI` khi không chỉ định `PhonemeAlphabet`, dẫn đến hiển thị chuỗi ký tự thô như `/aekaxdehmihk/` thay vì ký hiệu IPA chuẩn Oxford.
  - **Giải pháp**: Thiết lập bắt buộc `PhonemeAlphabet: "IPA"` trong cấu hình request header của cả hàm đánh giá âm thanh lẫn hàm kiểm tra kết nối (`testAzureSpeechConnection`). Giờ đây mọi từ vựng hiển thị chuẩn xác ký hiệu IPA Oxford như `/ækədɛmɪk/`.

- [x] **Hiển Thị Chi Tiết Từng Âm Tiết (Syllable Breakdown Chips - `07-speaking-engine.js`)**:
  - Hiển thị trực quan từng âm tiết kèm grapheme và độ chuẩn xác (%) với màu sắc chỉ báo rõ ràng (xanh lá: chuẩn xác >= 70%, vàng: cảnh báo >= 50%, đỏ: lỗi < 50%).

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-55 Build 356`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-54 Build 355 - Tích Hợp Toàn Diện Azure AI Speech)

- [x] **Tích Hợp Toàn Diện Microsoft Azure AI Speech (Pronunciation Assessment REST API - `07-speaking-engine.js`)**:
  - Xây dựng module chuyển đổi âm thanh `convertAudioBlobToWav16k` thuần JavaScript trong trình duyệt, tự động chuẩn hóa mọi định dạng ghi âm (WebM/Opus/AAC/WAV) sang chuẩn âm thanh 16,000Hz 16-bit Mono WAV PCM không phụ thuộc thư viện ngoài.
  - Tích hợp endpoint Azure Pronunciation Assessment (`https://{region}.stt.speech.microsoft.com/...`) với đầy đủ các tham số chuyên sâu: `HundredMark`, `Phoneme` (IPA), `Comprehensive`, `EnableProsodyAssessment: true`, `EnableMiscue: true`.
  - Phản hồi siêu tốc (< 1 giây), chấm điểm ngữ âm chính xác từng mili-giây, bóc tách chi tiết từng âm vị IPA, âm đầu (Onset), nguyên âm chính (Nucleus), âm đuôi (Coda) và từng âm tiết (Syllables).

- [x] **Xây Dựng Kiến Trúc AI Đa Tầng (Hybrid Speaking Architecture - `07-speaking-engine.js`)**:
  - Cung cấp 3 chế độ đánh giá phát âm tùy biến:
    1. 🌟 **Tự động Hybrid (Khuyên dùng)**: Kết hợp đo lường âm vị chính xác của Azure Speech + Phân tích mẹo luyện khẩu hình tiếng Việt chuyên sâu từ Gemini AI.
    2. ⚡ **Azure AI Speech Siêu Tốc**: Chấm trực tiếp qua Azure Pronunciation Assessment với phản hồi < 1s chuẩn Oxford & ELSA.
    3. 🧠 **Google Gemini Multimodal AI**: Đánh giá đa phương thức với mô hình ngôn ngữ lớn.
  - Tự động chuyển mạch dự phòng (Failover Engine): Nếu Azure gặp sự cố mạng hoặc hết quota, hệ thống tự động fallback mượt mà sang Gemini Multimodal AI mà không làm gián đoạn phiên học của người dùng.

- [x] **Giao Diện Quản Lý Khóa Azure AI Speech Bảo Mật & Tiện Lợi (`modal-settings.html`, `02-state-core.js`, `03-auth.js`)**:
  - Bổ sung mục cấu hình chuyên biệt `🎙️ Azure AI Speech (Speaking Lab)` trong Cài Đặt.
  - Ô nhập Azure Speech Key ẩn mật khẩu, tự động lưu trữ bảo mật cục bộ tại `localStorage` (không bao giờ lộ ra mã nguồn công khai), hỗ trợ đồng bộ đám mây cá nhân.
  - Ô cấu hình Vùng/Region (mặc định `japaneast` hoặc tùy chỉnh `southeastasia`, `eastus`...).
  - Nút **"🧪 Thử kết nối Azure Speech"** kiểm tra kết nối API thời gian thực và báo trạng thái trực quan ngay lập tức.
  - Hướng dẫn cấu hình chi tiết, trực quan kèm link truy cập Azure Portal.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-54 Build 355`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-53 Build 354 - Issue 41, 42, 43, 44, 45)

- [x] **Khắc Phục Lỗi Không Mở Được Hồ Sơ Công Khai @official & Người Dùng Khác (`03-auth.js` - Issue 41)**:
  - Khai báo các biến `matchedStudent`, `regEntry`, `nameMapEntry` ở phạm vi đầu hàm `openPublicProfileByAuthor`, sửa dứt điểm lỗi `ReferenceError: matchedStudent is not defined` khi mở hồ sơ `@official`.
  - Bổ sung kiểm tra an toàn `safeStudents = (typeof adminStudentsData !== 'undefined' && Array.isArray(adminStudentsData)) ? adminStudentsData : []` giúp người dùng chưa đăng nhập hoặc không phải Admin vẫn mở xem hồ sơ của tất cả học viên và người dùng khác một cách trơn tru.

- [x] **Khóa & Quản Lý Thời Gian Mở Hiệu Ứng Tên Sự Kiện Wardrobe (`13-wardrobe.js` - Issue 42, Ảnh 134007.png)**:
  - Loại bỏ hoàn toàn giá mua VoCoin khỏi các hiệu ứng tên sự kiện (`price: null`).
  - Tích hợp thuật toán tính ngày Lễ Phục Sinh (Computus Meeus/Jones/Butcher) và bảng tra cứu Âm Lịch Việt Nam (2020-2050) để tự động nhận diện chính xác Mùng 1 - Mùng 3 Tết.
  - Tự động mở MIỄN PHÍ hiệu ứng vào đúng thời gian sự kiện: Tiệc sinh nhật (10/08), Giáng sinh (18h 24/12 -> 23:59 25/12), Halloween (31/10), Tự hào Việt Nam (30/04 & 02/09), Tết Âm Lịch (Mùng 1 - Mùng 3 Âm lịch), Lễ Phục Sinh (Chủ Nhật Phục Sinh). Khóa và hiển thị lịch sự kiện khi chưa đến ngày.

- [x] **Điều Chỉnh Hiệu Ứng Vương Miện Khung VIP Lifetime Bồng Bềnh Nhẹ Nhàng (`13-wardrobe.js`, `app.css` - Issue 43, Ảnh 134854.png)**:
  - Tách riêng class vương miện đỉnh 12h thành `vip-lifetime-crown-inner` với `transform-box: fill-box; transform-origin: center center;`.
  - Thay thế hiệu ứng xoay 360 độ dữ dội bằng animation `vipLifetimeCrownFloat` (dập dềnh bồng bềnh, scale 0.96 - 1.04, nghiêng nhẹ -2deg đến 2deg quanh tâm) mang phong thái thanh lịch hoàng gia.

- [x] **Giải Trình Chi Tiết Cơ Chế Tích Lũy Điểm Rèn Luyện (Study EXP - Issue 44)**:
  - Phân tích và làm rõ vì sao tổng EXP hiện tại là 902 EXP (EXP ra mắt từ Build 335/341, Flashcard/Auto-Flashcard có trọng số nhận thức W_mode = 0 không tích lũy EXP để chống cày macro, chỉ các bài Quiz/Spelling/Speaking/Dictation/Writing/Translation mới tích lũy EXP).

- [x] **Hướng Dẫn Cung Cấp & Cấu Hình Thông Tin Azure AI (Speaking Lab - Issue 45)**:
  - Hướng dẫn cụ thể về Azure Speech Service (Key + Region) và Azure OpenAI Service (Endpoint, API Key, Deployment Model) phục vụ nâng cấp Speaking Engine.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-53 Build 354`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-52 Build 353 - Issue 36, 37, 38, 39, 40)

- [x] **Khắc Phục Lỗi Lệch Khung Avatar & Danh Xưng Community Tab Trong Hồ Sơ Công Khai (`03-auth.js` - Issue 36, Ảnh 124607.png)**:
  - Lưu trữ trực tiếp `targetWardrobe` và `vipTier` vào `currentPublicProfileAuthor` ngay khi tính toán xong, ngăn chặn việc rơi về khung tím VIP mặc định khi render tab Bài Viết Cộng Đồng trong hồ sơ công khai (`renderPubProfileCommunityPosts`).
  - Sử dụng `getAuthorVipTier(post.authorUid, authorName)` để phân loại chính xác các cấp bậc VIP (Monthly, Yearly, Lifetime).

- [x] **Đồng Bộ Toàn Diện Hiệu Ứng Tên & Danh Hiệu @official Trong Community Center (`03-auth.js` - Issue 37, Ảnh 124634.png)**:
  - Chuẩn hóa nhận diện tác giả `@official` với mọi bí danh (VocaFlow Chuẩn, VocaFlow Official, VocaFlow VocaVIP Official).
  - Hiển thị nhất quán chữ Gradient vàng/hồng/tím kèm vương miện hoàng gia 👑 và huy hiệu `👑 Đội Ngũ Phát Triển` trên mọi thẻ bài viết và bình luận cộng đồng.

- [x] **Khắc Phục Lỗi Bị Ghi Đè Hồ Sơ @iamjulies Trong Community Center (`03-auth.js` - Issue 38, Ảnh 124653.png)**:
  - Tái cấu trúc cơ chế tra cứu `getLiveUserRegistryEntry`: Ưu tiên tuyệt đối `currentUser` lên đầu tiên, cho phép người dùng `@iamjulies` tự do đổi tên hiển thị (như bé pè thâm), ảnh đại diện cá nhân, khung viền (Bé Mèo), hiệu ứng tên và danh xưng mà không bị ghi đè bởi hồ sơ mặc định của Founder.

- [x] **Thiết Lập /me (Hồ Sơ Cá Nhân) Làm Single Source of Truth (`03-auth.js`, `13-wardrobe.js` - Issue 39, Ảnh 125120.png)**:
  - Đồng bộ hóa nhất quán 100% mọi tùy chỉnh thẩm mỹ (Khung viền Avatar, Hiệu ứng tên, Danh xưng, Ảnh đại diện) từ trang cá nhân `/me` sang Header Desktop/Mobile, Bảng tin Cộng đồng, Danh sách bình luận, và Hồ sơ công khai.
  - Khắc phục xung đột giữa `updateAuthUI` và `applyWardrobeToActiveUI`, đảm bảo huy hiệu danh xưng hiển thị đúng trang bị Wardrobe thay vì bị đè bởi chuỗi VIP mặc định.

- [x] **Đồng Bộ Hiệu Ứng Tên Lên Tác Giả Bộ Từ VocaDeck & Sửa Lỗi Thẻ HTML Header (`04-decks-manager.js`, `header.html` - Issue 40, Ảnh 124718.png)**:
  - Đồng bộ hiệu ứng tên tác giả bộ từ trong danh sách VocaDeck (`renderDecks`) và màn hình chi tiết bộ từ (`openDeckDetail`) khớp chính xác với hiệu ứng trong Tủ Đồ và Hồ sơ cá nhân.
  - Sửa lỗi thẻ HTML đóng `</button>` bị thiếu ở nút VocaShop (`btn-shop`) trong `src/components/header.html`.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-52 Build 353`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-51 Build 352 - Issue 32, 33, 34, 35)

- [x] **Khắc Phục Lỗi Mất Lượt Quay May Mắn VocaSpin & Không Được Cộng (`10-lucky-wheel.js`, `08-wallet-economy.js`, `12-achievements.js` - Issue 32)**:
  - Loại bỏ hoàn toàn `localStorage.setItem('vocaflow_last_spin_date', getTodayString())` khỏi `setLuckySpinsCount()`, chỉ cập nhật ngày quay khi thực sự quay trong `triggerLuckyWheelSpin()`.
  - Vô hiệu hóa logic tự ý reset/kẹp số lượt quay trong `autoHealExcessVipSpinsToday()`, bảo vệ các lượt quay nhận được từ xem video quảng cáo, Level Up, rương danh vọng, hoặc admin bug bounty.
  - Đồng bộ toàn bộ các trường RTDB Firebase (`economy/luckySpins.json`, `economy/spins.json`, `economy.json` và `lucky_spins_left.json`) khi trao thưởng lượt quay.

- [x] **Đồng Bộ Hiệu Ứng Tên & Danh Xưng Wardrobe Trên Public Profile (`03-auth.js` - Issue 33, Ảnh 101151.png vs 101244.png)**:
  - Khắc phục lỗi Hồ sơ công khai (`/u/:uid` / `/@username`) bị đè danh xưng VIP mặc định và bỏ qua danh hiệu Wardrobe đã trang bị (ví dụ `🌸 Hoa Khôi VocaFlow`).
  - Ưu tiên hiển thị danh hiệu Wardrobe tùy chỉnh (`targetWardrobe.title`) trên huy hiệu hồ sơ công khai khớp 100% với trang cá nhân `/me`.
  - Cập nhật khung viền avatar và hiệu ứng tên phản ánh chính xác trạng thái trang bị thời gian thực.

- [x] **Đồng Bộ Hiệu Ứng Tên & Khung Avatar Trong Modal Người Theo Dõi / Đang Theo Dõi (`03-auth.js` - Issue 34, Ảnh 101413.png vs 101537.png, 101611.png, 101636.png)**:
  - Bổ sung trường `equippedWardrobe` vào bộ đối soát người dùng thời gian thực (`getLiveUserRegistryEntry`) và các tài khoản đặc biệt (VocaFlow Chuẩn, Founder Julies).
  - Chuẩn hóa điều kiện kiểm tra khung viền và hiệu ứng tên tùy chỉnh trước khi chuyển sang trạng thái VIP mặc định trong `openSubscribersListModal`.

- [x] **Đồng Bộ Toàn Diện Thẻ Bài Viết Bảng Tin Cộng Đồng & Bình Luận (`03-auth.js` - Issue 35, Ảnh 103550.png, 103559.png vs 103820.png, 101611.png)**:
  - Tích hợp hiển thị huy hiệu Danh Xưng Wardrobe (`postTitleBadgeHtml`) ngay cạnh tên tác giả bài viết trên Bảng Tin Trung Tâm Cộng Đồng (Community Center Feed).
  - Đồng bộ khung viền avatar, hiệu ứng tên động cho cả tác giả bài viết và người bình luận theo đúng trang bị hồ sơ cá nhân.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-51 Build 352`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-50 Build 351 - Issue 29, 30, 31)

- [x] **Khắc Phục Lỗi Sinh Bài Tập Dịch Thuật AI Song Phương & Bổ Sung Fallback Offline Chuẩn Xác (`06f-translation-engine.js` - Issue 29)**:
  - Sửa lỗi sinh bài tập Dịch thuật AI (Translation Engine) thất bại trên cả 3 chiều dịch (`vi_to_en`, `en_to_vi`, `random`).
  - Tối ưu hóa kích thước gói tạo câu hỏi (batching tối đa 8 từ/lượt), nâng trần token `maxOutputTokens: 4096`, mở rộng chuỗi model Gemini hiện đại (`gemini-2.5-flash`, `gemini-3.5-flash-lite`, `gemini-2.0-flash`, v.v.) và lấy fallback API key trực tiếp từ `STORAGE_KEY_GEMINI_KEY`.
  - Tích hợp động cơ sinh câu hỏi dịch thuật Offline thông minh `generateOfflineTranslationTask` chất lượng cao với bẫy trắc nghiệm ngữ cảnh, ngữ âm và định nghĩa phong phú, đảm bảo người dùng luôn có bài học ngay cả khi offline hoặc API gặp sự cố.

- [x] **Sửa Lỗi Chọn Số Lượng Câu Hỏi Trong Modal Thiết Lập (`06c-writing-engine.js`, `06d-cloze-engine.js`, `06e-dictation-engine.js`, `06f-translation-engine.js` - Issue 31)**:
  - Khắc phục triệt để lỗi khi người dùng chọn 5 câu, 10 câu hoặc tùy chỉnh trong modal thiết lập của Dictation, Translation, Writing nhưng hệ thống vẫn tải toàn bộ từ vựng trong bộ từ (ví dụ 215 từ).
  - Xử lý ép kiểu dữ liệu chuỗi/số đồng nhất (`'5'`, `'10'`, `'custom'`, `parseInt(val, 10)`) và cắt lát danh sách từ (`slice(0, targetCount)`) chính xác tuyệt đối.

- [x] **Đồng Bộ Hệ Số Quyết Toán Thoát Sớm Luyện Viết (`06-spelling-engine.js` - Issue 30)**:
  - Chuẩn hóa tham số độ khó trong `doExecuteExitSpelling` truyền trực tiếp `currentSpellingDifficulty` vào `calculateUnifiedSessionPoints`, đảm bảo tính toán đồng nhất 100% giữa dự đoán trên modal thoát sớm và số VoCoin ghi nhận vào Sổ Cái (Ledger).

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-50 Build 351`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-49 Build 350 - Issue 28)

- [x] **Chuẩn Hóa Trọng Số Nhận Thức $W_{\text{mode}}$ Cho Hệ Thống Tính Điểm EXP & VoCoin Unified Balance v4 (`02-state-core.js`)**:
  - Thiết lập bảng trọng số nhận thức độ phức tạp tư duy ($W_{\text{mode}}$) chuẩn xác tuyệt đối trên toàn bộ 8 chế độ học:
    * Flashcard / Auto Flashcard: **0.0x** (0 EXP / 0 VoCoin) - bảo vệ nền kinh tế chống cày cuốc tự động vô hạn.
    * Quiz (Trắc Nghiệm): **1.00x**
    * Spelling (Luyện Chính Tả): **1.33x**
    * Speaking (Luyện Nói AI): **1.67x**
    * Cloze Test (Điền Từ Đoạn Văn): **2.00x**
    * Translation (Dịch Thuật Song Phương): **2.33x**
    * Dictation (Nghe Gõ Câu): **2.67x**
    * Writing (Luyện Viết Tự Luận): **3.00x**
  - Cập nhật hàm tính toán điểm kinh nghiệm cốt lõi `calculateUnifiedStudyExp` và `calculateUnifiedSessionPoints` trong `02-state-core.js` để tự động xử lý hệ số độ khó dạng chuỗi (`'easy'`, `'medium'`, `'hard'`, `'expert'`) lẫn dạng đối tượng/số thực (`difficultyMult`, `diffMultiplier`).
  - Xử lý triệt để trường hợp $W_{\text{mode}} \le 0$ trả về đúng `0` EXP thay vì trả về điểm sàn `1` EXP.

- [x] **Quét Sạch Triệt Để Mọi Điểm Bất Nhất Giữa Modal Thoát Sớm (Early Exit Confirmation) & Bảng Tổng Kết (`05-quiz-engine.js`, `06-spelling-engine.js`, `06c-writing-engine.js`, `06d-cloze-engine.js`, `06e-dictation-engine.js`, `06f-translation-engine.js`, `07-speaking-engine.js`)**:
  - Sửa lỗi truyền thiếu mảng điểm thực tế (`questions` / `spellingItems` / `scores`) vào `promptStudyEarlyExit`, khiến modal cảnh báo thoát sớm giả định người dùng đạt 100% điểm ở tất cả các câu đã làm, dẫn đến EXP hiển thị trong modal thoát cao hơn EXP thực tế nhận được khi xác nhận thoát.
  - Đồng bộ hóa toàn diện tham số độ khó (`currentQuizDifficulty`, `currentSpellingDifficulty`, `currentWritingDifficulty`, `currentClozeDifficulty`, `currentDictationDifficulty`, `currentTranslationDifficulty`, `currentSpeakingDifficulty`) trên cả 7 động cơ học tập khi thoát sớm lẫn khi hoàn thành toàn bộ bài học.

- [x] **Sửa Lỗi Chế Độ Điền Từ (Cloze Test) Đạt 0% Vẫn Được Nhận Xu (`06d-cloze-engine.js` - Ảnh 235221.png)**:
  - Khắc phục lỗi tại `06d-cloze-engine.js` khi người dùng sai toàn bộ 0% các ô trống nhưng công thức nội suy điểm sàn vẫn cộng +8 Xu do điểm tối thiểu mặc định (`minXu = 20 * 0.4 = 8`). Bổ sung điều kiện kiểm tra nghiêm ngặt `accuracyPct > 0 && correctCount > 0`, nếu đúng 0 từ thì nhận đúng 0 Xu.

- [x] **Việt Hóa & Hoàn Thiện Thẻ Đánh Giá Viết Tự Luận Writing Lab (`06c-writing-engine.js` - Ảnh 235051.png)**:
  - Chuyển đổi nhãn thưởng thuộc từ trong thẻ phản hồi đánh giá bài viết từ tiếng Anh "Mastery" sang tiếng Việt "Thuộc từ" chuẩn mực, đồng bộ cùng hệ thống danh xưng toàn ứng dụng.

- [x] **Đồng Bộ Toàn Diện 7-Point Version Consistency (`v0.10.10-49 Build 350`)**:
  - Cập nhật phiên bản nhất quán trên toàn bộ 7 điểm hệ thống: `modal-settings.html`, `02-state-core.js`, toàn bộ module headers `01-router.js` đến `13-wardrobe.js`, `sw.js` & `Release_App/sw.js`, `pubspec.yaml`, `Program.cs`, `push_github.ps1`, `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`.

---

## 🎯 2. DANH SÁCH NHIỆM VỤ CÁC PHIÊN BẢN TRƯỚC (v0.10.10-48 Build 349)

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