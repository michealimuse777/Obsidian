@echo off
setlocal
echo ========================================================
echo   FINAL ATTEMPT: CLEAN & BUILD
echo ========================================================

:: 1. Clean Debris that confuses the builder
cd /d "C:\Users\Zala\.cache\solana\v1.52"
if exist "rust" (
    echo Removing duplicate 'rust' folder...
    rmdir /s /q "rust"
)
if exist "llvm" (
    echo Removing duplicate 'llvm' folder...
    rmdir /s /q "llvm"
)

:: 2. Setup Project Root
cd /d "C:\Users\Zala\.gemini\antigravity\scratch\obsidian"

:: 3. Force Environment Variables to use our valid tools
set "SOLANA_PATH=C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"
set "PATH=%SOLANA_PATH%;%PATH%"

set "TOOLCHAIN=C:\Users\Zala\.cache\solana\v1.52\platform-tools"
set "RUSTC=%TOOLCHAIN%\rust\bin\rustc.exe"
set "CARGO=%TOOLCHAIN%\rust\bin\cargo.exe"

echo Tools:
echo   Use Rustc: %RUSTC%
echo   Use Cargo: %CARGO%

:: 4. Run Build
echo.
echo Running Anchor Build...
call anchor build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   BUILD SUCCESSFUL!
    echo ========================================================
    
    echo.
    echo Deploying to Devnet...
    call anchor deploy --provider.cluster devnet
    
    echo.
    echo Initializing...
    call npx ts-node scripts/initialize-devnet.ts
    
    echo.
    echo DONE! You can now use the App.
    pause
    exit /b 0
) else (
    echo.
    echo Build failed again.
    pause
    exit /b 1
)
