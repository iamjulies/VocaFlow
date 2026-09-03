# VOCAFLOW - QUY TẮC PHÁT TRIỂN & BÀN GIAO BẢN PHÁT HÀNH (MANDATORY RULES)

## ⚠️ NGUYÊN TẮC BẮT BUỘC: CẬP NHẬT SONG SONG GITHUB VÀ VOCAFLOW.EXE (DESKTOP)

Mỗi khi phát triển tính năng mới, sửa lỗi (bugfix) hoặc chuẩn bị phát hành bất kỳ phiên bản nào:
**TUYỆT ĐỐI KHÔNG ĐƯỢC CHỈ CẬP NHẬT LÊN GITHUB MÀ QUÊN BIÊN DỊCH VÀ CẬP NHẬT `VocaFlow.exe`**.
Cả 2 nền tảng: **GitHub Web PWA** và **Windows Desktop EXE** PHẢI LUÔN ĐƯỢC CẬP NHẬT SONG SONG ĐỒNG THỜI!

---

### 📋 QUY TRÌNH PHÁT HÀNH CHUẨN (EXECUTION CHECKLIST):

1. **Biên Dịch `VocaFlow.exe` Mới Nhất**:
   - Thư mục dự án C#: `C:\Users\DELL\Documents\Modding\browser\VocaFlow_Desktop`
   - Cập nhật số phiên bản tiêu đề trong `Program.cs`.
   - Chạy lệnh biên dịch:
     ```powershell
     dotnet publish "C:\Users\DELL\Documents\Modding\browser\VocaFlow_Desktop\VocaFlow.csproj" -c Release -r win-x64 --no-self-contained
     ```
   - Copy file phát hành:
     - `VocaFlow.exe` & `VocaFlow.pdb` từ `VocaFlow_Desktop\bin\Release\net8.0-windows\win-x64\publish\`
     - Sang `Release_App\VocaFlow.exe`
     - Sang `GITHUB_RELEASE\VocaFlow_Windows_App\VocaFlow.exe`

2. **Đồng Bộ Mã Nguồn Web / HTML**:
   - Copy `vocaflow.html` sang `index.html`.
   - Copy `vocaflow.html` sang `Release_App\vocaflow.html`.
   - Copy `vocaflow.html` sang `GITHUB_RELEASE\vocaflow_web_single_file.html`.

3. **Đóng Gói ZIP Bản Phát Hành Portable**:
   - Đóng gói toàn bộ thư mục `Release_App` thành:
     `VocaFlow_<phiên_bản>_Windows_Portable.zip` trong cả thư mục gốc và `GITHUB_RELEASE`.

4. **Đẩy Lên 3 Kho GitHub (Automated Script)**:
   - Chạy tập lệnh: `GITHUB_RELEASE\push_github.ps1`
   - Đẩy đồng bộ lên:
     1. `iamjulies/VocaFlow` -> nhánh `main`
     2. `iamjulies/VocaFlow` -> nhánh `gh-pages`
     3. `iamjulies/iamjulies.github.io` -> nhánh `main`

5. **Ghi Chép Lịch Sử & Tài Liệu**:
   - Cập nhật phiên bản và nhật ký thay đổi trong `VOCAFLOW_OVERVIEW.txt`.
