# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.10-16 (Build 317)`  
> **Cập nhật lần cuối:** 2026-09-16  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI & TIẾN HÀNH BUILD/KIỂM THỬ CDP (100%)**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.10-16 Build 317)

- [x] **Chuẩn Hóa Phân Loại Chế Độ Học Tập (Core vs Extended Learning Modes β)**:
  - **Core Learning Modes (4 chế độ cốt lõi)**: 🎴 Flashcards, 🎯 Trắc Nghiệm (Quiz), ✍️ Chính Tả (Spelling), 🎙️ Luyện Nói (Speaking Lab).
  - **Extended Learning Modes (β - Các tính năng học mở rộng)**:
    - 👑 **Viết Câu (Writing Lab VIP β)**: Kỹ năng Writing
    - 🧩 **Điền Từ Cloze Test (Reading Lab β)**: Kỹ năng Reading (*Hoàn thành trong phiên bản này*)
    - 🎧 *Full Sentence Dictation (Listening Lab β)*: Kỹ năng Listening (*Roadmap các bản sau*)
    - 🌐 *Dịch Thuật Song Phương (Translation Lab β)*: Kỹ năng Translation (*Roadmap các bản sau*)
  - Gắn nhãn nhận diện `(β)` trực quan trên toàn bộ giao diện, nút bấm tại chi tiết bộ từ và modal thiết lập.

- [x] **Tính Năng Học Mới: Điền Từ Vào Đoạn Văn Có Bối Cảnh (Cloze Test - Reading Skill β)**:
  - **Ứng dụng Gemini AI**: Tích hợp model `gemini-3.5-flash-lite` và pool mô hình tốc độ cao tự động sinh đoạn văn ngữ cảnh mạch lạc dựa trên từ vựng trong bộ từ của người dùng.
  - **4 Cấp độ thử thách toàn diện**:
    1. 🟢 **Dễ (Easy)**: Đoạn văn ngắn (50-80 từ), 3-5 ô khuyết, 100% từ cần điền có trong bộ từ, x1.5 Điểm (+20 ~ 35 Xu/bài).
    2. 🟡 **Trung Bình (Medium)**: Đoạn văn vừa (80-130 từ), 5-8 ô khuyết, phần lớn từ trong bộ từ + từ ngữ cảnh bổ sung, x2.0 Điểm (+40 ~ 70 Xu/bài).
    3. 🔴 **Khó (Hard)**: Đoạn văn dài vừa (120-180 từ), 8-12 ô khuyết, 50% từ trong bộ từ & 50% từ ngoài bộ từ, x2.8 Điểm (+80 ~ 130 Xu/bài).
    4. 🔥 **Siêu Khó (Master / Super Hard)**: Đoạn văn dài (160-250 từ), 10-15 ô khuyết, tỉ lệ ngẫu nhiên + **20-30% từ bẫy thừa (Decoy Distractors)** không thuộc bất kỳ ô trống nào, x4.0 Điểm (+150 ~ 250 Xu/bài).
  - **Tương tác đa nền tảng tối ưu (3 trong 1)**:
    - Kéo thả mượt mà (HTML5 Drag & Drop).
    - Nhấp chọn thông minh (Click-to-place / Tap-to-place) tối ưu cho màn hình cảm ứng điện thoại / máy tính bảng.
    - Nhấp vào ô trống đã điền để gỡ từ trả về ngân hàng từ.
  - **Hệ thống phím tắt bàn phím toàn diện**:
    - Phím số `1` -> `9` chọn nhanh các ô từ 1 đến 9.
    - Phím chữ cái `a` -> `z` chọn nhanh các ô từ 10 trở đi.
    - Phím `Backspace` / `Delete` gỡ từ khỏi ô đang chọn.
    - Phím `Tab` / `Shift+Tab` hoặc mũi tên điều hướng giữa các ô.
    - Phím `Ctrl+Enter` / `Enter` nộp bài chấm điểm.
  - **Bảo bối học tập & Hỗ trợ chuyên sâu**:
    - 💡 **VocaHint**: Gợi ý từ loại, nghĩa tiếng Việt, chữ cái đầu và độ dài từ cho ô đang chọn.
    - ⏭️ **VocaSkip**: Tự động điền đáp án chuẩn vào ô đang chọn.
    - 🔊 **Passage Audio TTS**: Đọc toàn bộ bài văn bằng giọng tiếng Anh bản ngữ mượt mà kèm thanh trạng thái sóng âm.
    - 🇻🇳 **Bản Dịch Tiếng Việt Toàn Văn**: Xem và đối chiếu bản dịch tiếng Việt sau khi làm bài.
    - 📋 **Phân Tích Chi Tiết Từng Ô**: Giải thích ngữ pháp và ngữ cảnh collocations cho từng vị trí.
    - 🔄 **Offline Fallback Generator**: Bộ sinh đoạn văn mẫu ngoại tuyến giúp chế độ hoạt động 100% khi mất mạng hoặc API bận.

- [x] **Đồng Bộ Toàn Diện Phiên Bản & Đóng Gói Multi-Deploy (v0.10.10-16 Build 317)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.10-16 (Build 317)`)
  - `src/components/screens/screen-decks.html` (`v0.10.10-16 (Build 317)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.10-16 (Build 317)`)
  - `src/scripts/modules/01-router.js` (`v0.10.10-16 Build 317`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.10-16'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.10-16 (Build 317)'`)
  - `src/scripts/modules/06d-cloze-engine.js` (Engine Cloze Test mới)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.10-16`)
  - `pubspec.yaml` (`version: 0.10.10+317`)
  - `VocaFlow_Desktop/Program.cs` (`v0.10.10-16`)
  - `GITHUB_RELEASE/push_github.ps1` (`v0.10.10-16 (Build 317)`)
  - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`