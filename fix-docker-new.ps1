# Docker Quick Fix Script
Write-Host "Docker Quick Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker Desktop is running
Write-Host "Checking Docker Desktop status..." -ForegroundColor Yellow
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcess) {
    Write-Host "Docker Desktop is running (PID: $($dockerProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "Docker Desktop is not running" -ForegroundColor Red
}

# Test Docker connection
Write-Host ""
Write-Host "Testing Docker connection..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "Docker connection OK: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not responding"
    }
} catch {
    Write-Host "Docker connection failed" -ForegroundColor Red
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow

    # Try to start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Docker Desktop started, please wait for initialization" -ForegroundColor Green
        Write-Host "This may take 1-2 minutes..." -ForegroundColor Gray
    } else {
        Write-Host "Cannot find Docker Desktop installation" -ForegroundColor Red
        Write-Host "Please start Docker Desktop manually" -ForegroundColor Yellow
        exit 1
    }
}

# Wait for Docker to start
Write-Host ""
Write-Host "Waiting for Docker service to start..." -ForegroundColor Yellow
$maxWait = 60
$waited = 0
$dockerReady = $false

while (($waited -lt $maxWait) -and (-not $dockerReady)) {
    try {
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            Write-Host "Docker service is ready" -ForegroundColor Green
        } else {
            throw "Docker not ready"
        }
    } catch {
        $waitTime = $waited + 5
        Write-Host "Waiting for Docker to start... ($waitTime s / $maxWait s)" -ForegroundColor Gray
        Start-Sleep -Seconds 5
        $waited += 5
    }
}

if (-not $dockerReady) {
    Write-Host "Docker startup timeout" -ForegroundColor Red
    Write-Host "Please check if Docker Desktop is running properly" -ForegroundColor Yellow
    exit 1
}

# Test Docker Compose
Write-Host ""
Write-Host "Testing Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Host "Docker Compose OK: $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "Docker Compose not available" -ForegroundColor Red
    }
} catch {
    Write-Host "Docker Compose not available" -ForegroundColor Red
}

# Test basic Docker functionality
Write-Host ""
Write-Host "Testing Docker functionality..." -ForegroundColor Yellow
try {
    docker run --rm hello-world 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker test passed" -ForegroundColor Green
    } else {
        Write-Host "Docker test failed" -ForegroundColor Red
    }
} catch {
    Write-Host "Docker test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker fix complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run the build script:" -ForegroundColor Yellow
Write-Host "  .\docker-build-and-test.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or run quick rebuild:" -ForegroundColor Yellow
Write-Host "  .\docker-rebuild.ps1" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
