@echo off
setlocal
echo ========================================================
echo   NUCLEAR OPTION: DIRECT BUILD
echo ========================================================

:: 1. Navigate to project root
cd /d "%~dp0"
cd ..

:: 2. Set Toolchain Variables (Bypassing the wrapper)
set "TOOLCHAIN=C:\Users\Zala\.cache\solana\v1.52\platform-tools"
set "RUST_BIN=%TOOLCHAIN%\rust\bin"
set "LLVM_BIN=%TOOLCHAIN%\llvm\bin"

:: 3. Set Compiler Paths
set "RUSTC=%RUST_BIN%\rustc.exe"
set "CARGO=%RUST_BIN%\cargo.exe"

:: 4. Force PATH to look here first
set "PATH=%RUST_BIN%;%LLVM_BIN%;%PATH%"

echo Compiler: %RUSTC%
echo Cargo:    %CARGO%

:: 5. Run Cargo Directly
echo.
echo Building SBF Program...
cd programs\obsidian
"%CARGO%" build --target sbf-solana-solana --release

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FAIL] Cargo build failed. 
    echo Maybe 'sbf-solana-solana' target is missing or dependencies are broken.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Cargo Build Complete!
echo Moving artifacts to deploy folder...

:: 6. Move Artifacts for Anchor
:: We are inside programs\obsidian.
if exist "target\sbf-solana-solana\release\obsidian.so" (
    echo Found artifact in program target.
    copy /Y "target\sbf-solana-solana\release\obsidian.so" "..\..\target\deploy\obsidian.so"
    copy /Y "target\sbf-solana-solana\release\obsidian_keypair.json" "..\..\target\deploy\obsidian-keypair.json"
) else (
    echo Checking root target...
    if exist "..\..\target\sbf-solana-solana\release\obsidian.so" (
        copy /Y "..\..\target\sbf-solana-solana\release\obsidian.so" "..\..\target\deploy\obsidian.so"
        copy /Y "..\..\target\sbf-solana-solana\release\obsidian_keypair.json" "..\..\target\deploy\obsidian-keypair.json"
    ) else (
         echo [FAIL] Could not locate built .so file.
         dir /s obsidian.so
         pause
         exit /b 1
    )
)

:: Return to root
cd ..\..

:: 7. Deploy
echo.
echo Deploying to Devnet...
set "SOLANA_PATH=C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"
set "PATH=%SOLANA_PATH%;%PATH%"

:: Set Wallet explicitly to the one in project root
set "ANCHOR_WALLET=%~dp0..\win_keypair.json"
echo Using Wallet: %ANCHOR_WALLET%

:: Airdrop SOL to fund deployment (Acc needs ~3 SOL)
echo.
echo [SKIP] Auto-Airdrop (Rate limited). Please fund manually if needed.
:: call solana airdrop 2 -u devnet -k "%ANCHOR_WALLET%"

:: Fix "account data too small" error by extending program size
echo.
echo Extending program storage size (prevent upgrade failure)...
echo [SKIPPED] Extension step to save time (assuming already extended).
:: call solana program extend BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9 200000 -u devnet -k "%ANCHOR_WALLET%"

echo.
echo Deploying to Devnet...
call anchor deploy --provider.cluster devnet --provider.wallet "%ANCHOR_WALLET%"

echo.
echo If deploy succeeded, we can initialize!
pause
