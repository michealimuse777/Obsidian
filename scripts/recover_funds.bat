@echo off
echo ========================================================
echo   RECOVERING 2.72 SOL FROM STUCK BUFFER
echo ========================================================

set "SOLANA_PATH=C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"
set "PATH=%SOLANA_PATH%;%PATH%"

:: First, let's SEE what buffers actually exist
echo Listing all buffers for this wallet...
call solana program show --buffers -k "%~dp0..\win_keypair.json" --url devnet

echo.
echo If you see an address above with ~2.72 SOL, copy it!
echo.
echo Closing Attempt 2 (Closing ALL buffers automatically):
call solana program close --buffers --bypass-warning -k "%~dp0..\win_keypair.json" --url devnet

echo.
echo ========================================================
echo   CHECKING NEW BALANCE
echo ========================================================
call solana balance -k "%~dp0..\win_keypair.json" --url devnet

echo.
echo If balance is > 2.5 SOL, you can Run nuclear_build.bat now!
pause
