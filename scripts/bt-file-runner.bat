@echo off
REM ────────────────────────────────────────────────────────────────────────
REM BT File Downloader — standalone immediate runner
REM
REM Independent of the nightly photo pipeline. Run this whenever you want
REM to make progress on the BT files import:
REM
REM   scripts\bt-file-runner.bat
REM
REM Output goes to scripts\bt-file-runner.log so you can audit unattended
REM runs the same way the photo runner does.
REM ────────────────────────────────────────────────────────────────────────

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%"

set "LOGFILE=%PROJECT_ROOT%\scripts\bt-file-runner.log"

REM Force Python stdout/stderr to UTF-8 so unicode chars (→, ✓, ⚠) in
REM the downloader's log messages don't crash the script when the log
REM file is opened in the default Windows cp1252 codepage.
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"

echo. >> "%LOGFILE%"
echo ================================================================== >> "%LOGFILE%"
echo File-runner started: %DATE% %TIME% >> "%LOGFILE%"
echo ================================================================== >> "%LOGFILE%"

python scripts\bt-file-download.py --batch 99999 >> "%LOGFILE%" 2>&1
set "EXITCODE=%ERRORLEVEL%"

echo File-runner finished: %DATE% %TIME%  (exit %EXITCODE%) >> "%LOGFILE%"

popd
exit /b %EXITCODE%
