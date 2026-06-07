@echo off
REM ────────────────────────────────────────────────────────────────────────
REM BT Nightly Runner — scheduled-task wrapper
REM
REM Pipeline (in order):
REM   1. Auto-export       — Playwright pulls fresh CSVs into bt-csv-inbox/
REM   2. Inbox import      — bt-import-folder.py feeds CSVs to bt-import.py
REM   3. Photo downloader  — fetches photos for any new jobs
REM
REM The FILE downloader runs separately via scripts\bt-file-runner.bat.
REM ────────────────────────────────────────────────────────────────────────

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%"

set "LOGFILE=%PROJECT_ROOT%\scripts\bt-photo-runner.log"

echo. >> "%LOGFILE%"
echo ================================================================== >> "%LOGFILE%"
echo Run started: %DATE% %TIME% >> "%LOGFILE%"
echo ================================================================== >> "%LOGFILE%"

echo -- step 1: bt-auto-export -- >> "%LOGFILE%"
python scripts\bt-auto-export.py >> "%LOGFILE%" 2>&1

echo. >> "%LOGFILE%"
echo -- step 2: bt-import-folder -- >> "%LOGFILE%"
python scripts\bt-import-folder.py >> "%LOGFILE%" 2>&1

echo. >> "%LOGFILE%"
echo -- step 3: bt-photo-download --batch 99999 -- >> "%LOGFILE%"
python scripts\bt-photo-download.py --batch 99999 >> "%LOGFILE%" 2>&1
set "EXITCODE=%ERRORLEVEL%"

echo. >> "%LOGFILE%"
echo -- progress snapshot -- >> "%LOGFILE%"
python scripts\bt-photo-progress.py >> "%LOGFILE%" 2>&1

echo Run finished: %DATE% %TIME%  (exit %EXITCODE%) >> "%LOGFILE%"

popd
exit /b %EXITCODE%
