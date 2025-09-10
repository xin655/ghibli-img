@echo off
chcp 65001 >nul
echo 🚀 Stripe订阅状态更新测试 - Windows版本
echo.

REM 检查参数
if "%1"=="" (
    echo 使用方法:
    echo   test-subscription-windows.bat ^<事件类型^>
    echo   test-subscription-windows.bat list
    echo   test-subscription-windows.bat lifecycle
    echo   test-subscription-windows.bat payment
    echo   test-subscription-windows.bat status
    echo.
    echo 示例:
    echo   test-subscription-windows.bat subscription-created
    echo   test-subscription-windows.bat lifecycle
    echo.
    goto :list_events
)

REM 检查Stripe CLI是否安装
echo 🔍 检查Stripe CLI状态...
stripe --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Stripe CLI未安装或不在PATH中
    echo 💡 请从 https://stripe.com/docs/stripe-cli 下载并安装
    pause
    exit /b 1
)

echo ✅ Stripe CLI已安装

REM 检查登录状态
echo 🔍 检查Stripe登录状态...
stripe config --list | findstr "test_mode_api_key" >nul
if errorlevel 1 (
    echo ⚠️ 未登录Stripe账户
    echo 💡 请运行: stripe login
    pause
    exit /b 1
)

echo ✅ 已登录Stripe账户
echo.

REM 根据参数执行相应操作
if "%1"=="list" goto :list_events
if "%1"=="lifecycle" goto :lifecycle
if "%1"=="payment" goto :payment
if "%1"=="status" goto :status

REM 单个事件测试
goto :single_event

:list_events
echo 📋 可用的通知事件:
echo   1. subscription-created - 订阅创建通知
echo   2. subscription-updated - 订阅更新通知
echo   3. subscription-cancelled - 订阅取消通知
echo   4. payment-succeeded - 支付成功通知
echo   5. payment-failed - 支付失败通知
echo   6. checkout-completed - 结账完成通知
echo.
goto :end

:lifecycle
echo 🔄 发送订阅生命周期通知...
echo.
echo [1/5] 结账完成通知...
stripe trigger checkout.session.completed
timeout /t 2 /nobreak >nul

echo [2/5] 订阅创建通知...
stripe trigger customer.subscription.created
timeout /t 2 /nobreak >nul

echo [3/5] 支付成功通知...
stripe trigger invoice.payment_succeeded
timeout /t 2 /nobreak >nul

echo [4/5] 订阅更新通知...
stripe trigger customer.subscription.updated
timeout /t 2 /nobreak >nul

echo [5/5] 订阅取消通知...
stripe trigger customer.subscription.deleted
echo.
echo 🎉 订阅生命周期通知发送完成！
goto :end

:payment
echo 💰 发送支付相关通知...
echo.
echo [1/3] 支付成功通知...
stripe trigger invoice.payment_succeeded
timeout /t 2 /nobreak >nul

echo [2/3] 支付失败通知...
stripe trigger invoice.payment_failed
timeout /t 2 /nobreak >nul

echo [3/3] 支付成功通知...
stripe trigger invoice.payment_succeeded
echo.
echo 🎉 支付相关通知发送完成！
goto :end

:status
echo 📊 Stripe CLI状态:
stripe --version
echo.
echo 📋 配置信息:
stripe config --list
goto :end

:single_event
echo 📢 发送单个通知: %1
echo.

if "%1"=="subscription-created" (
    echo 🎉 新订阅已创建！用户已成功订阅服务。
    stripe trigger customer.subscription.created
) else if "%1"=="subscription-updated" (
    echo 🔄 订阅已更新！用户订阅状态发生变化。
    stripe trigger customer.subscription.updated
) else if "%1"=="subscription-cancelled" (
    echo ❌ 订阅已取消！用户取消了订阅服务。
    stripe trigger customer.subscription.deleted
) else if "%1"=="payment-succeeded" (
    echo 💰 支付成功！订阅费用已成功收取。
    stripe trigger invoice.payment_succeeded
) else if "%1"=="payment-failed" (
    echo ⚠️ 支付失败！订阅费用收取失败。
    stripe trigger invoice.payment_failed
) else if "%1"=="checkout-completed" (
    echo ✅ 结账完成！用户已完成订阅流程。
    stripe trigger checkout.session.completed
) else (
    echo ❌ 未知的事件类型: %1
    echo.
    echo 可用的事件类型:
    echo   subscription-created
    echo   subscription-updated
    echo   subscription-cancelled
    echo   payment-succeeded
    echo   payment-failed
    echo   checkout-completed
    goto :end
)

echo.
echo ✅ 通知发送完成！

:end
echo.
echo 📋 下一步:
echo   1. 检查应用日志中的webhook处理信息
echo   2. 运行 node scripts/check-user-status.js 检查用户状态
echo   3. 查看Stripe Dashboard中的事件日志
echo.
pause

