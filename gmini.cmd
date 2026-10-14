@echo off
setlocal
chcp 65001 >nul
node "%~dp0bin\gmini.js" %*
exit /b %errorlevel%
