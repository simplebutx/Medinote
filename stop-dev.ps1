$ErrorActionPreference = "SilentlyContinue"

function Stop-ProcessByPort {
    param(
        [int]$Port,
        [string]$Name
    )

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen

    if (-not $connections) {
        Write-Host "$Name ($Port): 실행 중인 프로세스 없음"
        return
    }

    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force
            Write-Host "$Name ($Port): PID $pid 종료"
        } catch {
            Write-Warning "$Name ($Port): PID $pid 종료 실패"
        }
    }
}

Write-Host "[1/6] frontend-test 종료..."
Stop-ProcessByPort -Port 5173 -Name "frontend-test"

Write-Host "[2/6] ai-server 종료..."
Stop-ProcessByPort -Port 8000 -Name "ai-server"

Write-Host "[3/6] backend-auth 종료..."
Stop-ProcessByPort -Port 8080 -Name "backend-auth"

Write-Host "[4/6] backend-medication 종료..."
Stop-ProcessByPort -Port 8081 -Name "backend-medication"

Write-Host "[5/6] backend-consultation 종료..."
Stop-ProcessByPort -Port 8082 -Name "backend-consultation"

Write-Host "[6/6] Redis 중지 시도..."
try {
    docker stop my-redis | Out-Null
    Write-Host "Redis 컨테이너를 중지했습니다."
} catch {
    Write-Warning "Redis 컨테이너를 자동으로 중지하지 못했습니다."
}
