@echo off
REM OSINT 平台启动脚本

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║     OSINT 平台 - 项目启动脚本 v2.1.0                   ║
echo ║     Start OSINT Platform Project                      ║
echo ╚════════════════════════════════════════════════════════╝
echo.

setlocal enabledelayedexpansion

REM 获取脚本所在目录
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1] 检查项目结构...
if not exist "backend" (
    echo ❌ 错误: 找不到 backend 文件夹
    echo ❌ 请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ 错误: 找不到 frontend 文件夹
    pause
    exit /b 1
)

echo ✅ 项目结构检查完成
echo.

REM 检查 Python
echo [2] 检查 Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未安装 Python
    echo 请访问 https://www.python.org/downloads/ 下载安装
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ %PYTHON_VERSION%
echo.

REM 检查 Node.js/Yarn
echo [3] 检查 Node.js 和 Yarn...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未安装 Node.js
    echo 请访问 https://nodejs.org/download/ 下载安装
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION%

yarn --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  未安装 Yarn, 将使用 npm
    set USE_NPM=1
)

echo.
echo [4] 启动后端服务...
echo.
echo 📂 后端目录: %SCRIPT_DIR%backend
cd /d "%SCRIPT_DIR%backend"

REM 检查依赖
if not exist "venv" (
    echo 📦 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 安装依赖
echo 📦 安装 Python 依赖...
pip install -q -r requirements.txt

REM 启动后端
echo.
echo 🚀 启动后端服务器 (http://localhost:8000)...
echo.
python server.py

REM 如果后端退出，提示用户
if errorlevel 1 (
    echo.
    echo ❌ 后端服务启动失败
    echo 请检查错误信息上面的内容
)

pause
