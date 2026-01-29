@echo off
echo ========================================================
echo   VERIFYING MANUAL INSTALLATION
echo ========================================================

set "RUSTC=C:\Users\Zala\.cache\solana\v1.52\platform-tools\rust\bin\rustc.exe"

echo Checking if rustc exists...
if exist "%RUSTC%" (
    echo [OK] Found rustc.exe
) else (
    echo [FAIL] rustc.exe NOT found at:
    echo %RUSTC%
    pause
    exit /b 1
)

echo.
echo Running 'rustc --version'...
"%RUSTC%" --version

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] rustc executed successfully!
) else (
    echo.
    echo [FAIL] rustc failed to execute. Error code: %ERRORLEVEL%
    echo You may be missing Visual C++ Redistributables (vc_redist.x64).
    pause
    exit /b 1
)

echo.
echo Cleaning up debris in v1.52 folder...
cd /d "C:\Users\Zala\.cache\solana\v1.52"
:: Remove rogue 'rust' folder if it exists (but not inside platform-tools)
if exist "rust" (
    echo Deleting duplicate 'rust' folder...
    rmdir /s /q "rust"
)
if exist "llvm" (
    echo Deleting duplicate 'llvm' folder...
    rmdir /s /q "llvm"
)

echo.
echo Cleanup complete. Now retrying build...
cd /d "C:\Users\Zala\.gemini\antigravity\scratch\obsidian"

:: Setup Path one last time
set "PATH=%PATH%;C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"

call anchor build

pause
