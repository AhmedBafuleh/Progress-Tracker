@echo off
setlocal
set ROOT=%~dp0
start "Progress Tracker API" cmd /k "cd /d %ROOT%backend && npm.cmd run dev"
start "Progress Tracker Web" cmd /k "cd /d %ROOT%web && npm.cmd run dev"
echo Progress Tracker backend and web development servers are starting.
endlocal
