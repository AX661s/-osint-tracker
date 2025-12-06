#!/usr/bin/env pwsh
# OSINT 平台启动脚本 (PowerShell 版本)

$PSDefaultParameterValues['*:Encoding'] = 'UTF8'

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     OSINT 平台 - 项目启动脚本 v2.1.0                   ║" -ForegroundColor Cyan
Write-Host "║     Start OSINT Platform Project                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 检查项目结构
Write-Host "[1] 检查项目结构..." -ForegroundColor Yellow

if (-not (Test-Path "backend")) {
    Write-Host "❌ 错误: 找不到 backend 文件夹" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "❌ 错误: 找不到 frontend 文件夹" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 项目结构检查完成" -ForegroundColor Green
Write-Host ""

# 检查 Python
Write-Host "[2] 检查 Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误: 未安装 Python" -ForegroundColor Red
    Write-Host "请访问 https://www.python.org/downloads/ 下载安装" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ $pythonVersion" -ForegroundColor Green
Write-Host ""

# 检查 Node.js
Write-Host "[3] 检查 Node.js 和 Yarn..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误: 未安装 Node.js" -ForegroundColor Red
    Write-Host "请访问 https://nodejs.org/download/ 下载安装" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

$yarnVersion = yarn --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  未安装 Yarn, 将使用 npm" -ForegroundColor Yellow
    $useNpm = $true
} else {
    Write-Host "✅ Yarn $yarnVersion" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4] 启动后端服务..." -ForegroundColor Yellow
Write-Host ""

$backendDir = Join-Path $scriptDir "backend"
Set-Location $backendDir

# 检查虚拟环境
if (-not (Test-Path "venv")) {
    Write-Host "📦 创建虚拟环境..." -ForegroundColor Cyan
    python -m venv venv
}

# 激活虚拟环境
$activateScript = Join-Path "venv\Scripts" "Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
}

# 安装依赖
Write-Host "📦 安装 Python 依赖..." -ForegroundColor Cyan
pip install -q -r requirements.txt

# 启动后端
Write-Host ""
Write-Host "🚀 启动后端服务器 (http://localhost:8000)..." -ForegroundColor Green
Write-Host ""

python server.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 后端服务启动失败" -ForegroundColor Red
    Write-Host "请检查错误信息上面的内容" -ForegroundColor Yellow
}

Read-Host "按 Enter 键退出"
