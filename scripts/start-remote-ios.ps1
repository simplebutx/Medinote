param(
  [string]$HostIp,
  [switch]$Build
)

function Get-TailscaleIPv4 {
  $tailscaleExe = "C:\Program Files\Tailscale\tailscale.exe"

  if (-not (Test-Path $tailscaleExe)) {
    throw "Tailscale이 설치되어 있지 않습니다. -HostIp로 직접 Tailscale IPv4를 넘겨 주세요."
  }

  $ip = & $tailscaleExe ip -4 | Select-Object -First 1
  if (-not $ip) {
    throw "Tailscale IPv4를 찾지 못했습니다. -HostIp로 직접 지정해 주세요."
  }

  return $ip.Trim()
}

if (-not $HostIp) {
  $HostIp = Get-TailscaleIPv4
}

$env:MOBILE_EXPO_HOST = $HostIp
$env:MOBILE_API_HOST = $HostIp

Write-Host "iPhone remote test API host: $HostIp"

$composeArgs = @(
  "-f", "docker-compose.yml",
  "-f", "docker-compose.remote.yml",
  "up", "-d"
)

if ($Build) {
  $composeArgs += "--build"
}

$composeArgs += @(
  "backend-auth",
  "backend-medication",
  "backend-consultation",
  "ai-server",
  "mobile-expo"
)

docker compose @composeArgs
