@echo off
echo Setting up environment for Anchor Build...

:: 1. Navigate to the script's directory (resolved absolute path)
cd /d "%~dp0"

:: 2. Go up one level to the project root (where Anchor.toml is)
cd ..

echo Active Workspace: %cd%

:: 3. Add Solana to PATH
set "PATH=%PATH%;C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"

echo Path updated.
echo Running Anchor Build...

:: 4. Run Anchor Build
call anchor build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   BUILD SUCCESSFUL!
    echo ========================================================
    echo You can now return to VS Code and ask me to 'Run anchor deploy'.
    pause
) else (
    echo.
    echo ========================================================
    echo   BUILD FAILED!
    echo ========================================================
    echo Please check the error messages above.
    pause
)
