@echo off
echo ========================================================
echo   DIAGNOSING RUST COMPILER CRASH
echo ========================================================

set "RUSTC=C:\Users\Zala\.cache\solana\v1.52\platform-tools\rust\bin\rustc.exe"

if not exist "%RUSTC%" (
    echo [ERROR] rustc.exe not found!
    pause
    exit /b 1
)

echo Found rustc at: %RUSTC%
echo.
echo Attempting to run: rustc --version
echo --------------------------------------------------------

:: Try to run and capture output/error
"%RUSTC%" --version
set EXIT_CODE=%ERRORLEVEL%

echo.
echo --------------------------------------------------------
echo Exit Code: %EXIT_CODE%

if %EXIT_CODE% NEQ 0 (
    echo.
    echo [CRITICAL ERROR] Rust compiler crashed or failed.
    echo.
    echo Common Cause: Missing "Visual C++ Redistributable"
    echo.
    echo Please download and install "vc_redist.x64" from Microsoft:
    echo https://aka.ms/vs/17/release/vc_redist.x64.exe
) else (
    echo [SUCCESS] Rust compiler works! 
    echo If build still fails, the issue is elsewhere.
)

pause
