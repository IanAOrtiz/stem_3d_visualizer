$ErrorActionPreference = "Stop"

function Start-DevProcess {
  param (
    [Parameter(Mandatory = $true)][string]$Path
  )

  $command = "cd `"$Path`"; npm run dev"
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command $command" | Out-Null
}

$root = Split-Path -Parent $PSScriptRoot

Start-DevProcess -Path (Join-Path $root "backend\api")
Start-DevProcess -Path (Join-Path $root "backend\orchestrator")
Start-DevProcess -Path (Join-Path $root "frontend")
