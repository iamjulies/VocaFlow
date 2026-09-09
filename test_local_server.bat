@echo off
title VocaFlow - Local Network Test Server (No GitHub Spam)
color 0b
echo ========================================================
echo    VOCAFLOW - MAY CHU KIEM THU MANG NOI BO (PORT 8080)
echo ========================================================
echo.
echo Dang lay dia chi IP mang noi bo cua ban...
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0 "') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
echo.
echo [1] Truy cap tren trinh duyet may tinh:
echo     -> http://localhost:8080/vocaflow.html
echo     -> http://localhost:8080/index.html
echo.
echo [2] Truy cap tren dien thoai / may tinh khac (cung Wi-Fi):
echo     -> http://%LOCAL_IP%:8080/vocaflow.html
echo.
echo [3] Mo nhieu Profile Chrome (Guest / Free / VIP) de test dong bo cheo!
echo.
echo [!] Nhan Ctrl + C de dung may chu khi test xong.
echo ========================================================
echo.
python -m http.server 8080
pause
