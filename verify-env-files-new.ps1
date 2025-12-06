# Verify Environment Variable Files
Write-Host "Environment Variable Files Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$files = @{
    ".env.docker" = @(
        "HIBP_API_KEY",
        "OSINT_INDUSTRIES_API_KEY",
        "RAPIDAPI_KEY",
        "IPQS_API_KEY",
        "WHATSAPP_API_KEY",
        "CHECKLEAKED_API_KEY",
        "REACT_APP_MAPBOX_ACCESS_TOKEN",
        "SECRET_KEY",
        "ADMIN_USERNAME",
        "ADMIN_PASSWORD"
    )
    "backend/.env" = @(
        "HIBP_API_KEY",
        "OSINT_INDUSTRIES_API_KEY",
        "RAPIDAPI_KEY"
    )
    "frontend/.env.development" = @(
        "REACT_APP_API_URL",
        "REACT_APP_MAPBOX_ACCESS_TOKEN"
    )
    "frontend/.env.production" = @(
        "REACT_APP_API_URL",
        "REACT_APP_MAPBOX_ACCESS_TOKEN"
    )
}

$allValid = $true

foreach ($file in $files.Keys) {
    Write-Host "Checking $file ..." -ForegroundColor Yellow
    
    if (-not (Test-Path $file)) {
        Write-Host "  [FAIL] File does not exist" -ForegroundColor Red
        $allValid = $false
        continue
    }
    
    $content = Get-Content $file -Raw
    $requiredKeys = $files[$file]
    
    foreach ($key in $requiredKeys) {
        if ($content -match "$key=.+") {
            Write-Host "  [OK] $key" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $key not configured or empty" -ForegroundColor Red
            $allValid = $false
        }
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
if ($allValid) {
    Write-Host "All environment variable files verified successfully" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some environment variables are missing or not configured" -ForegroundColor Red
    exit 1
}
Write-Host "========================================" -ForegroundColor Cyan
