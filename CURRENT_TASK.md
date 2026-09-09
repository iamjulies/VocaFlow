# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-alpha-26 (Build 258)`  
> **Cập nhật lần cuối:** 2026-09-09  
> **Trạng thái:** ✅ **ĐÃ HOÀN TẤT 100% - KIỂM THỬ THÀNH CÔNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT

- [x] **Nhiệm vụ 1: Khắc phục lỗi nhân đôi / trùng lặp từ vựng trong VocaDeck**
  - Xây dựng động cơ tự động gộp từ trùng lặp `reconcileDuplicateWordsInDecks(targetDeckId, triggerSave)`.
  - Nhóm các từ vựng có cùng thuật ngữ (không phân biệt chữ hoa hay chữ thường, tự động chuẩn hóa dấu cách).
  - Tự động lọc và gộp nét nghĩa: nếu định nghĩa giống nhau thì xóa nét nghĩa bị trùng, nếu định nghĩa mới bổ sung thêm thì gộp bằng dấu chấm phẩy.
  - Bảo tồn điểm thuộc từ cao nhất (`masteryScore`) và trạng thái học (`mastered` > `learning` > `newWord`).
  - Đưa các ID từ vựng trùng lặp bị loại bỏ vào `deletedWordIds` (tombstone) để Firebase Cloud RTDB cũng tự động xóa bỏ hoàn toàn, tránh việc tải ngược từ trùng từ Cloud.
  - Sửa `autoHealOrphanWords` để không tạo từ trùng khi quét bản sao lưu hoặc từ mồ côi.
  - Tự động kích hoạt khử trùng lặp khi khởi động ứng dụng (`loadDatabase()`), khi mở chi tiết bộ từ (`openDeckDetail(deckId)`), và sau khi đồng bộ Cloud (`handleManualSync()`).
  - Bổ sung nút bấm thủ công `🔄 Dọn Từ Trùng` (`handleManualDeduplicateCurrentDeck()`) trong thanh công cụ `screen-deck-detail` để người dùng có thể kích hoạt dọn dẹp bất cứ lúc nào.

- [x] **Nhiệm vụ 2: Xóa 2 nút Cổng Quản Trị & God Mode trong Cài Đặt**
  - Xóa bỏ hoàn toàn 2 nút "Truy Cập Cổng Quản Trị" và "Chế Độ God Mode (Publisher Portal)" khỏi modal Cài Đặt (`src/components/modals/modal-settings.html`).
  - Cổng Quản Trị & Publisher Portal được chuyển về đúng cơ chế ẩn bảo mật: chạm nhanh 5 lần vào huy hiệu phiên bản trên Header hoặc trong Cài đặt (`handleVersionBadgeMultiClick`).

- [x] **Nhiệm vụ 3: Tối ưu giao diện Header & VocaDeck trên màn hình hẹp / di động (Hình 1)**
  - Thu gọn thanh điều hướng: các nhãn chữ dài trên Header tự động ẩn, các nút phụ (`📖 Hướng Dẫn`, `🤖 VocaMentor`, `💼 VocaStudio`, `👑 VocaVIP`) tự động co và chuyển dần vào menu 3 chấm (`#btn-header-more`) khi màn hình hẹp dần (< 768px, < 640px).
  - Đảm bảo nút 3 chấm (`#btn-header-more` / `.mobile-more-wrapper`) luôn được ghim cố định ở góc phải với `margin-left: auto; flex-shrink: 0;` và `display: inline-flex !important;`, không bao giờ bị tràn hay khuất khỏi màn hình.
  - Thêm class tự động co `header.compact-header` hỗ trợ cả resize sự kiện lẫn CSS.
  - Ẩn chữ trên các nút thao tác thẻ VocaDeck (`.deck-actions-grid .btn span`) trên màn hình < 768px để các icon hiển thị gọn gàng, tránh vỡ thẻ hoặc tràn nút.

- [x] **Nhiệm vụ 4: Lưu trạng thái và đồng bộ Cloud cho Tabs & Ghim & Bộ lọc**
  - **Tabs VocaDeck**: Lưu tab hiện tại ("Đang học" / "Kho Lưu Trữ") vào `localStorage` (`vocaflow_deck_tab`), lưu trữ lên Cloud (`deckTab`), và tự động khôi phục đúng tab khi mở app hoặc đồng bộ.
  - **Trạng thái Ghim & Lưu trữ**: Sửa triệt để lỗi logic `(local.isPinned === true) || (remote.isPinned === true)` trong `handleManualSync`. Đổi sang so sánh timestamp và ưu tiên hành động cục bộ khi timestamp bằng nhau, cho phép bỏ ghim hoặc hủy lưu trữ vĩnh viễn.
  - **Bộ lọc VocaWord**: Ghi nhớ bộ lọc đang chọn (Tất cả, 0%, 1-25%,...) vào `localStorage` (`vocaflow_word_filter`), đồng bộ lên Cloud (`wordFilter`), và tự động kích hoạt lại đúng chip lọc khi vào chi tiết bộ từ.

- [x] **Nhiệm vụ 5: Quy trình Build & Triển khai GitHub tự động**
  - Tự động lắp ghép qua `build_vocaflow.ps1`.
  - Kiểm tra độ cân bằng ngoặc nhọn `{}` và kiểm thử Headless Edge.
  - Tự động commit và đẩy lên nhánh `main` và nhánh triển khai `gh-pages` trên GitHub mà không cần hỏi lại.
