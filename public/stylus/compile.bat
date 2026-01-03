@echo off
REM BECMI VTT - Stylus Compilation Script
REM Compiles main.styl to main.css

echo Compiling Stylus to CSS...

REM Check if stylus is installed
where stylus >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Stylus is not installed or not in PATH
    echo.
    echo To install Stylus:
    echo   npm install -g stylus
    echo.
    pause
    exit /b 1
)

REM Compile Stylus to CSS
stylus main.styl -o ../css/main.css --compress

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: main.css compiled successfully!
) else (
    echo.
    echo ERROR: Compilation failed
    pause
    exit /b 1
)

pause
