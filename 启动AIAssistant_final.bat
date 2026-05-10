@echo off

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未检测到Node.js
    echo 请先下载并安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js已安装

REM 切换到AIAssistant目录
cd "E:\MyProgrammingSoftware\AIAssistant"

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败！
        echo 请检查网络连接后重试。
        pause
        exit /b 1
    )
    echo 依赖安装成功！
)

REM 启动应用
echo 正在启动AIAssistant...
npm run dev

if %errorlevel% neq 0 (
    echo 应用启动失败！
    echo 请检查错误信息并修复问题。
    pause
    exit /b 1
)

pause
