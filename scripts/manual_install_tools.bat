@echo off
setlocal
echo ========================================================
echo   MANUAL PLATFORM TOOLS INSTALLER
echo ========================================================

:: Define paths
set "CACHE_ROOT=C:\Users\Zala\.cache\solana"
set "VERSION=v1.52"
set "TARGET_DIR=%CACHE_ROOT%\%VERSION%"
set "URL=https://github.com/anza-xyz/platform-tools/releases/download/%VERSION%/platform-tools-windows-x86_64.tar.bz2"
set "ARCHIVE=platform-tools.tar.bz2"

:: Create directory
echo Creating cache directory: %TARGET_DIR%
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
cd /d "%TARGET_DIR%"

:: Download
echo Downloading platform-tools from %VERSION%...
powershell -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%ARCHIVE%'"

if not exist "%ARCHIVE%" (
    echo [ERROR] Download failed.
    pause
    exit /b 1
)

:: Extract
echo Extracting archive...
:: Windows tar supports .tar.bz2
tar -xf "%ARCHIVE%"

if exist "platform-tools" (
    echo [SUCCESS] Platform tools installed manually!
    echo Cleaning up archive...
    del "%ARCHIVE%"
    
    echo.
    echo NOW RUNNING ANCHOR BUILD...
    echo.
    
    :: Setup Path again just in case
    set "PATH=%PATH%;C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"
    
    cd /d "C:\Users\Zala\.gemini\antigravity\scratch\obsidian"
    call anchor build
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================================
        echo   BUILD SUCCESSFUL!  (Finally!)
        echo ========================================================
    ) else (
        echo.
        echo   Build still failed, but tools should be installed.
    )
) else (
    echo [ERROR] Extraction failed. 'platform-tools' folder not found.
)

pause
