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
3. Chạy kiểm thử tự động Headless Browser (Edge) qua kịch bản kiểm tra để đảm bảo trang tải không lỗi cú pháp JavaScript và các hàm cốt lõi đều hoạt động.
4. Cập nhật `CURRENT_TASK.md` để ghi nhận tiến độ thực tế.
