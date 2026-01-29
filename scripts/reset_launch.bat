@echo off
echo ==========================================
echo      OBSIDIAN LAUNCHPAD - V2 RESET
echo ==========================================
echo.
cd /d "%~dp0\.."

:: Try to fix missing paths (Explicit Path to Version)
set SOLANA_BIN=%USERPROFILE%\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin
set PATH=%PATH%;%SOLANA_BIN%;%USERPROFILE%\.avm\bin

echo Using Solana Path: %SOLANA_BIN%
echo.

:: Clear SBF Cache to fix panic
:: echo Clearing Solana Cache...
:: if exist "%USERPROFILE%\.cache\solana" rd /s /q "%USERPROFILE%\.cache\solana"

echo [1/3] Building Smart Contract (this may take a minute)...
call anchor build
if %errorlevel% neq 0 (
    echo Build Failed! Make sure you have Solana installed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Deploying to Devnet...
call anchor deploy --provider.cluster devnet
if %errorlevel% neq 0 (
    echo Deployment Failed! Check your internet or SOL balance.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Initializing Launch V2...
call npx tsx scripts/initialize-devnet.ts
if %errorlevel% neq 0 (
    echo Initialization Failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo        SUCCESS! LAUNCH IS LIVE.
echo ==========================================
echo.
pause
