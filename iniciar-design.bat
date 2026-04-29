@echo off
cd /d "%~dp0"
git checkout design-improvements
start http://localhost:3002
npx next dev -p 3002
