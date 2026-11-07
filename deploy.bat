@echo off
REM Puts Max (phone app + backend) on Cloudflare. First time: a browser opens - sign in to Cloudflare and press Allow.
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js first from https://nodejs.org  ^(LTS^), then double-click this again. & pause & exit /b 1)
call npx --yes wrangler@4 whoami 2>&1 | findstr /I /C:"not authenticated" >nul && call npx --yes wrangler@4 login
call node build.mjs
call npx --yes wrangler@4 deploy
echo Done. Open https://max-ai-backend.mjgaly-mg.workers.dev/health to check.
pause
