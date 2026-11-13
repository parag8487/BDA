@echo off
REM Double-click this file to start the BDA project, then open http://localhost:3000
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install
)
start "" http://localhost:3000
call npm run dev
