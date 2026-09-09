# SYSTEM RULES & BẤT BIẾN QUY TẮC PHÁT TRIỂN (VOCAFLOW)

> **Tệp này là bộ nhớ bất biến của Antigravity AI Assistant.**
> Bất cứ khi nào bắt đầu phiên làm việc mới hoặc tiếp tục dự án, PHẢI ĐỌC VÀ TUÂN THỦ 100% CÁC NGUYÊN TẮC NÀY.

---

## 🚫 1. NHỮNG ĐIỀU TUYỆT ĐỐI CẤM KỴ (ZERO TOLERANCE)

1. **CẤM TỰ TIỆN SỬA ĐỔI HOẶC XÓA CODE KHÔNG LIÊN QUAN:**
   - Bất kỳ tính năng, khối giao diện, hoặc logic nào đang vận hành ổn định mà người dùng KHÔNG yêu cầu sửa thì **PHẢI GIỮ NGUYÊN VẸN 100%**.
   - Không được phép "tiện tay tối ưu", cấu trúc lại hoặc tự ý xóa bỏ những hàm/biến/giao diện cũ.
   - Khi chia nhỏ file HTML/JS hoặc lắp ghép qua `build_vocaflow.ps1`, phải kiểm tra cẩn thận từng thẻ đóng/mở, không để sót hay chèn nhầm phần tử vào trong modal khác.

2. **CẤM ĐỂ MẤT DỮ LIỆU TỪ VỰNG & BỘ TỪ CỦA NGƯỜI DÙNG:**
   - Từ vựng, bộ từ và tiến độ học tập là tài sản quý giá nhất của học viên.
   - Mọi thuật toán đồng bộ (Sync) hoặc khử trùng lặp (Deduplication) **PHẢI BẢO TỒN TỪ VỰNG**.
   - Tuyệt đối không được xóa hoặc tombstone từ vựng nếu không chắc chắn 100% rằng bản sao của từ đó đã được chuyển giao thành công sang bộ từ chính.
   - Luôn có cơ chế Tự Phục Hồi Từ Mồ Côi (`autoHealOrphanWords`): Nếu một từ bị mất `deckId`, phải tự động map lại vào bộ từ cùng tên hoặc bộ từ đang hoạt động, không bao giờ vứt bỏ.

3. **QUY TRÌNH DEPLOY GITHUB KHI PHÁT HÀNH PHIÊN BẢN MỚI:**
   - Mỗi khi hoàn thành và chốt bản Build phiên bản mới (ví dụ v0.10.9-alpha-26), sau khi build và kiểm thử cú pháp/headless đạt 100%, **TỰ ĐỘNG COMMIT & PUSH LÊN GITHUB** (nhánh `main` và nhánh `gh-pages`) mà không cần hỏi lại người dùng lần thứ hai.
   - Giữ commit message ngắn gọn, rõ ràng theo chuẩn: `Release vX.Y.Z-alpha-N (Build M)`.

---

## 🛠️ 2. QUY TRÌNH PHÁT HÀNH & ĐỒNG BỘ GITHUB

- Mọi bản cập nhật phiên bản chính thức/alpha mới được đẩy trực tiếp lên `origin main` và nhánh triển khai `gh-pages` để người dùng có thể mở và test trực tiếp trên điện thoại và trình duyệt thật mà không gặp sự cố kết nối máy chủ cục bộ (local server).
- Trước khi push, PHẢI kiểm tra cú pháp và chạy kiểm thử Edge Headless thành công.

---

## 🧪 3. QUY TRÌNH KIỂM TRA CHẤT LƯỢNG BẮT BUỘC TRƯỚC KHI BÀN GIAO

Trước khi hoàn thành turn và thông báo cho người dùng:
1. Chạy `powershell -ExecutionPolicy Bypass -File .\build_vocaflow.ps1` để lắp ghép toàn bộ các component `src/` vào `vocaflow.html` và `index.html`.
2. Kiểm tra độ cân bằng ngoặc `{}` (diff phải bằng 0 tuyệt đối).
3. Chạy kiểm thử tự động Headless Browser (Edge) qua kịch bản kiểm tra để đảm bảo trang tải không lỗi cú pháp JavaScript và các hàm cốt lõi đều hoạt động (`typeof decks !== 'undefined'`, `typeof renderDecks === 'function'`).
4. Cập nhật `CURRENT_TASK.md` để ghi nhận tiến độ thực tế.
5. Chạy `powershell -ExecutionPolicy Bypass -File .\GITHUB_RELEASE\push_github.ps1` để tự động đóng gói ZIP, commit và push lên cả 3 kho GitHub (`main`, `gh-pages`, `iamjulies.github.io`).

---

## 🔍 4. BÍ QUYẾT XỬ LÝ NHANH "LỖI MẤT TƯƠNG TÁC / TRỐNG TRƠN MÀN HÌNH" (BLANK SCREEN TROUBLESHOOTING)

> **Hiện tượng**: Mở ứng dụng lên thấy Header và khung viền HTML tĩnh nhưng danh sách bộ từ (`deck-grid`) trống trơn, số đếm từ hiển thị 0, bấm vào các nút/tab không có bất kỳ phản hồi nào.

### 🎯 Nguyên nhân cốt lõi (Root Cause):
- **99% do Lỗi cú pháp JavaScript (SyntaxError)** trong file `src/scripts/app.js` (phổ biến nhất là `Uncaught SyntaxError: Unexpected token '}'` do thừa dấu đóng ngoặc khi replace code, hoặc thiếu ngoặc `}` / `)` / `;` khi thêm tính năng mới).
- Do Javascript là ngôn ngữ đơn luồng nạp tuần tự: Khi trình duyệt gặp 1 lỗi SyntaxError duy nhất trong thẻ `<script>`, toàn bộ file script sẽ **BỊ DỪNG NẠP NGAY LẬP TỨC**. Hệ quả là tất cả các biến toàn cục (`decks`, `words`, `currentUser`) và hàm xử lý (`initApp`, `renderDecks`, `setDeckTab`) đều là `undefined`.

### ⚡ Quy trình chẩn đoán & Sửa chữa trong 30 giây (30-Second Fix Recipe):
1. **Bước 1: Chạy kịch bản chẩn đoán Headless Edge ghi log lỗi**:
   Tạo hoặc chạy file PowerShell kiểm thử chẩn đoán để đọc trực tiếp `stderr` từ trình duyệt:
   ```powershell
   $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
   $proc = Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--enable-logging=stderr", "--v=1", "file:///C:/Users/DELL/Documents/Modding/browser/vocaflow.html" -PassThru -NoNewWindow -RedirectStandardError "edge_eval_err.txt"
   Start-Sleep -Seconds 3
   Stop-Process -Id $proc.Id -Force
   Get-Content "edge_eval_err.txt" | Select-String "SyntaxError", "ReferenceError", "Uncaught"
   ```
2. **Bước 2: Xác định chính xác số dòng lỗi**:
   Xem log sẽ thấy ngay thông báo dạng: `Uncaught SyntaxError: Unexpected token '}' (line XXXXX)`.
3. **Bước 3: Mở file `src/scripts/app.js` tại vị trí lỗi**:
   Tìm vị trí vừa sửa ở hàm gần nhất (ví dụ hàm vừa sửa `renderAiChatMessages`, `evaluateSpeakingAudioWithGemini`, `handleManualSync`...), kiểm tra các dấu `{}` đóng mở và xóa ngay đoạn ngoặc thừa/thiếu.
4. **Bước 4: Biên dịch lại và xác nhận**:
   Chạy `powershell -ExecutionPolicy Bypass -File .\build_vocaflow.ps1`.
   Chạy lại test script headless, xác nhận log in ra `TEST_EVAL: SUCCESS_PAGE_READY` và `decks length > 0`.

---

## 🚀 5. QUY TRÌNH PHÁT HÀNH GITHUB 1-CLICK CHUYÊN NGHIỆP

1. **Đồng bộ hóa phiên bản tại 7 vị trí (7-Point Version Consistency)**:
   - `src/scripts/app.js` (`VOCAFLOW_APP_VERSION = 'vX.Y.Z'`, `VOCAFLOW_APP_FULL_TITLE = '...'`)
   - `src/components/header.html` (`.brand-version`)
   - `src/components/modals/modal-settings.html` (`#settings-app-version-label`)
   - `sw.js` & `Release_App/sw.js` (`CACHE_NAME`)
   - `pubspec.yaml` (`version: X.Y.Z+BUILD`)
   - `VOCAFLOW_OVERVIEW.txt` & `GITHUB_RELEASE\VOCAFLOW_OVERVIEW.txt`
   - `GITHUB_RELEASE\push_github.ps1`
2. **Lắp ghép bundle**: Chạy `.\build_vocaflow.ps1`.
3. **Kiểm thử tự động**: Chạy script kiểm thử Headless Edge, đảm bảo 100% test cases `[PASS]`.
4. **Triển khai tự động**: Chạy `.\GITHUB_RELEASE\push_github.ps1` để biên dịch `VocaFlow.exe`, nén file zip phát hành `VocaFlow_vX.Y.Z_Windows_Portable.zip`, commit và push sang 3 kho:
   - `iamjulies/VocaFlow` (main)
   - `iamjulies/VocaFlow` (gh-pages)
   - `iamjulies/iamjulies.github.io` (main)
