@echo off
setlocal
chcp 65001 >nul
node "%~dp0bin\gmini.js" setup %*
exit /b %errorlevel%
