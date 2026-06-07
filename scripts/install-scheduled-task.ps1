# ─────────────────────────────────────────────────────────────────────────
# install-scheduled-task.ps1
# Registers a Windows Scheduled Task that runs the BT photo downloader
# nightly at 2:00 AM under the current user account.
#
# Usage (from PowerShell, in the project root):
#   .\scripts\install-scheduled-task.ps1
#
# Re-running is safe — it overwrites the existing task with the same name.
# To uninstall:
#   Unregister-ScheduledTask -TaskName "PBS - BT Photo Downloader" -Confirm:$false
# ─────────────────────────────────────────────────────────────────────────

$TaskName    = "PBS - BT Photo Downloader"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Runner      = Join-Path $ProjectRoot "scripts\bt-photo-runner.bat"

if (-not (Test-Path $Runner)) {
    Write-Error "Runner not found at $Runner"
    exit 1
}

Write-Host "Project root: $ProjectRoot"
Write-Host "Runner script: $Runner"
Write-Host ""

# Build the task pieces
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$Runner`"" `
    -WorkingDirectory $ProjectRoot

# Daily trigger at 2:00 AM local time
$trigger = New-ScheduledTaskTrigger -Daily -At 2am

# Settings: run only when AC powered, allow start when missed, stop if hung
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 30)

# Run under the currently logged-in user, no password prompt
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# Wipe an old version if present
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "Removing existing task '$TaskName'..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Nightly catch-up: pulls any new BT daily-log photos into Supabase." | Out-Null

Write-Host ""
Write-Host "✓ Task '$TaskName' registered." -ForegroundColor Green
Write-Host "  Next run:  daily at 2:00 AM"
Write-Host "  Logs:      $ProjectRoot\scripts\bt-photo-runner.log"
Write-Host ""
Write-Host "To run it once now (test):"
Write-Host "  Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host ""
Write-Host "To remove it later:"
Write-Host "  Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false"
