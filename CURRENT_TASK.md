# CURRENT TASK & TRẠNG THÁI CÔNG VIỆC HIỆN TẠI (VOCAFLOW)

> **Phiên bản mục tiêu:** `v0.10.9-67 (Build 299)`  
> **Cập nhật lần cuối:** 2026-09-13  
> **Trạng thái:** 🚀 **HOÀN TẤT TRIỂN KHAI VÀ XUẤT BẢN ĐA NỀN TẢNG**

---

## 🎯 1. DANH SÁCH NHIỆM VỤ ĐÃ GIẢI QUYẾT (v0.10.9-67 Build 299)

- [x] **Xóa Sạch & Vĩnh Viễn Lỗi Sai Khi Học (Instant Force Mistake Removal & Anti-Resurrection Cloud Sync)**:
  - Khắc phục dứt điểm lỗi từ sai không được xóa ra khỏi Sổ Tay Lỗi Sai trong quá trình học.
  - Chuyển đổi toàn bộ cơ chế xóa lỗi sai sang `removeWordFromMistakeList(word, true)`: Mỗi khi từ vựng được học (trong Flashcard tự động) hoặc làm đúng/đạt điểm sàn (trong Quiz, Spelling, Speaking, Mistake Review), toàn bộ bản ghi của từ đó lập tức bị xóa sạch 100% khỏi Sổ Tay Lỗi Sai.
  - Thuật toán so khớp đa chiều: Khớp `id`, `wordId`, `term`, `normTerm` (loại bỏ dấu câu, chuẩn hóa chữ thường).
  - Kiến trúc Bia Mộ Đám Mây Kháng Hồi Sinh: Lưu trữ toàn bộ các mã định danh của từ đã xóa vào `deletedMistakeWordKeys`, đồng bộ 2 chiều lên Cloud và cập nhật logic `mergeCloudDataIntoLocal` trong `03-auth.js` để tuyệt đối KHÔNG hồi sinh các từ đã bị xóa từ các bản sao lưu cũ trên đám mây.
  - Tự động cập nhật số đếm huy hiệu trên Header (`#header-mistake-count`) và trong màn hình Bộ từ ngay lập tức.

- [x] **Khắc Phục Triệt Để Lỗi Không Đóng Cửa Sổ Thêm Từ Vựng Mới (Modal-Word Auto-Close Fix)**:
  - Gắn sự kiện `onclick="saveWordForm(event)"` trực tiếp lên nút "Lưu từ vựng", thêm `novalidate` vào `<form id="word-form">`, loại bỏ thuộc tính `required` khỏi các ô nhập liệu động đa nét nghĩa (`display: none`).
  - Đảm bảo `saveWordForm` luôn được thực thi và gọi `closeModal('modal-word')` thành công 100% bất kể người dùng thêm từ 1 nghĩa hay nhiều nét nghĩa polysemy.

- [x] **Đồng Bộ Toàn Diện 7 Vị Trí Phiên Bản & Đóng Gói Multi-Deploy (v0.10.9-67 Build 299)**:
  - `src/components/modals/modal-settings.html` (`VocaFlow v0.10.9-67 (Build 299)`)
  - `src/components/screens/screen-decks.html` (`v0.10.9-67 (Build 299)`)
  - `src/components/screens/screen-deck-detail.html` (`v0.10.9-67 (Build 299)`)
  - `src/scripts/modules/01-router.js` (`v0.10.9-67 Build 299`)
  - `src/scripts/modules/02-state-core.js` (`const VOCAFLOW_APP_VERSION = 'v0.10.9-67'`, `const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-67 (Build 299)'`)
  - `sw.js` & `Release_App/sw.js` & `GITHUB_RELEASE/sw.js` (`vocaflow-pwa-v0.10.9-67`)
  - `pubspec.yaml` (`version: 0.10.9+299`)
  - `VocaFlow_Desktop/Program.cs` (`VocaFlow v0.10.9-67`)
  - `GITHUB_RELEASE/push_github.ps1` (`VocaFlow_v0.10.9-67_Windows_Portable.zip`, commit `v0.10.9-67 (Build 299)`)
  - `VOCAFLOW_OVERVIEW.txt`, `GITHUB_RELEASE/VOCAFLOW_OVERVIEW.txt`, `CURRENT_TASK.md` (`v0.10.9-67 (Build 299)`)