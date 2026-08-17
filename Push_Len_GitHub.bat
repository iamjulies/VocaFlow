@echo off
title VocaFlow - GitHub Sync
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0GITHUB_RELEASE\push_github.ps1"
echo.
pause
