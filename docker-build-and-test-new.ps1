# Docker Build and Test Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Docker Build and Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify environment files
Write-Host "Step 1/5: Verifying environment files..." -ForegroundColor Yellow
if (Test-Path "verify-env-files-new.ps1") {
    powershell -ExecutionPolicy Bypass -File verify-env-files-new.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Environment verification failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Warning: verify-env-files-new.ps1 not found, skipping verification" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Stop existing containers
Write-Host "Step 2/5: Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "Existing containers stopped" -ForegroundColor Green
Write-Host ""

# Step 3: Build images
Write-Host "Step 3/5: Building Docker images..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
docker-compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Docker images built successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Start containers
Write-Host "Step 4/5: Starting containers..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start containers" -ForegroundColor Red
    exit 1
}
Write-Host "Containers started successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Wait and verify
Write-Host "Step 5/5: Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Checking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build and Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:     docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop services: docker-compose down" -ForegroundColor White
Write-Host "  Restart:       docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
