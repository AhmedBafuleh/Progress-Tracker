@echo off
setlocal
set ROOT=%~dp0
start "Progress Tracker PHP API" cmd /k "cd /d %ROOT%backend && php -S 127.0.0.1:4000 router.php"
start "Progress Tracker Web" cmd /k "cd /d %ROOT%web && npm.cmd run dev"
echo Progress Tracker PHP/MySQL backend and web development servers are starting.
endlocal
