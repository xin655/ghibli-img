@echo off
chcp 65001 >nul
echo 🚀 Stripe订阅状态快速测试
echo.

REM 检查Stripe CLI
stripe --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Stripe CLI未安装
    pause
    exit /b 1
)

echo ✅ Stripe CLI已安装
echo.

REM 快速测试订阅事件
echo 📤 发送订阅创建事件...
stripe trigger customer.subscription.created
echo.

echo 📤 发送支付成功事件...
stripe trigger invoice.payment_succeeded
echo.

echo 📤 发送订阅更新事件...
stripe trigger customer.subscription.updated
echo.

echo 🎉 快速测试完成！
echo.
echo 📋 检查结果:
echo   1. 查看应用日志
echo   2. 运行: node scripts/check-user-status.js
echo.
pause

