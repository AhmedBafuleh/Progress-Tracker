@echo off
setlocal
set ROOT=%~dp0
start "Progress Tracker Laravel API" cmd /k "cd /d %ROOT%backend && php artisan serve --host=127.0.0.1 --port=4000"
start "Progress Tracker Web" cmd /k "cd /d %ROOT%web && npm.cmd run dev"
echo Progress Tracker Laravel/MySQL backend and React web client are starting.
endlocal
