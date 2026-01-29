@echo off
echo ========================================================
echo   REPAIRING SOLANA BUILD ENVIRONMENT
echo ========================================================

:: 1. Navigate to project root
cd /d "%~dp0"
cd ..

:: 2. Clean Corrupted Toolchain Cache
echo Cleaning Solana toolchain cache...
if exist "C:\Users\Zala\.cache\solana" (
    rmdir /s /q "C:\Users\Zala\.cache\solana"
    echo Cache cleared.
) else (
    echo Cache already clean.
)

:: 3. Setup Path
set "PATH=%PATH%;C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"

echo Path updated.
echo Restarting Anchor Build (This will redownload platform-tools)...

:: 4. Run Build
call anchor build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   BUILD SUCCESSFUL!
    echo ========================================================
    pause
) else (
    echo.
    echo ========================================================
    echo   BUILD FAILED!
    echo ========================================================
    pause
)
