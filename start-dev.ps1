$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-NewShell {
    param(
        [string]$Title,
        [string]$Workdir,
        [string]$Command
    )

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command",
        "Set-Location -LiteralPath '$Workdir'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
    )
}

Write-Host "[1/6] Redis 시작 시도..."
try {
    docker start my-redis | Out-Null
    Write-Host "Redis 컨테이너를 시작했습니다."
} catch {
    Write-Warning "Redis를 자동으로 시작하지 못했습니다. Docker Desktop이 켜져 있는지 확인하세요."
}

Write-Host "[2/6] backend-auth 실행..."
Start-NewShell `
    -Title "backend-auth" `
    -Workdir (Join-Path $projectRoot "backend-auth") `
    -Command ".\gradlew.bat bootRun"

Write-Host "[3/6] backend-medication 실행..."
Start-NewShell `
    -Title "backend-medication" `
    -Workdir (Join-Path $projectRoot "backend-medication") `
    -Command ".\gradlew.bat bootRun"

Write-Host "[4/6] backend-consultation 실행..."
Start-NewShell `
    -Title "backend-consultation" `
    -Workdir (Join-Path $projectRoot "backend-consultation") `
    -Command ".\gradlew.bat bootRun"

Write-Host "[5/6] ai-server 실행..."
Start-NewShell `
    -Title "ai-server" `
    -Workdir (Join-Path $projectRoot "ai-server") `
    -Command "& '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload"

Write-Host "[6/6] frontend-test 실행..."
Start-NewShell `
    -Title "frontend-test" `
    -Workdir (Join-Path $projectRoot "frontend-test") `
    -Command "npm.cmd run dev"

Write-Host ""
Write-Host "개발 서버 실행 요청을 모두 보냈습니다."
Write-Host "Redis가 안 켜졌다면 Docker Desktop을 먼저 실행한 뒤 'docker start my-redis'를 다시 실행하세요."
