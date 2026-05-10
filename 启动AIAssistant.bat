@echo off

REM AIAssistant启动脚本
REM 运行智能AI助手软件

echo =============================================
echo         🤖 AIAssistant 启动脚本
 echo =============================================
echo.
echo 正在启动智能AI助手...
echo 这可能需要一些时间，请稍候...
echo.

REM 切换到AIAssistant目录
cd "E:\MyProgrammingSoftware\AIAssistant"

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 检测到依赖未安装，正在安装...
    echo 这可能需要几分钟时间...
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败！
        echo 请检查网络连接后重试。
        pause
        exit /b 1
    )
    echo 依赖安装成功！
echo.
)

REM 启动应用
echo 正在启动应用...
npm run dev

if %errorlevel% neq 0 (
    echo 应用启动失败！
    echo 请检查错误信息并修复问题。
    pause
    exit /b 1
)

pause
