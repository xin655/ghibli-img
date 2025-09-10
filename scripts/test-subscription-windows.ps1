# Stripe订阅状态更新测试 - PowerShell版本
param(
    [string]$EventType = "",
    [switch]$List,
    [switch]$Lifecycle,
    [switch]$Payment,
    [switch]$Status,
    [switch]$Help
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 显示帮助信息
function Show-Help {
    Write-Host "🚀 Stripe订阅状态更新测试 - PowerShell版本" -ForegroundColor Green
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor Yellow
    Write-Host "  .\test-subscription-windows.ps1 -EventType <事件类型>"
    Write-Host "  .\test-subscription-windows.ps1 -List"
    Write-Host "  .\test-subscription-windows.ps1 -Lifecycle"
    Write-Host "  .\test-subscription-windows.ps1 -Payment"
    Write-Host "  .\test-subscription-windows.ps1 -Status"
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "  .\test-subscription-windows.ps1 -EventType subscription-created"
    Write-Host "  .\test-subscription-windows.ps1 -Lifecycle"
    Write-Host ""
}

# 检查Stripe CLI状态
function Test-StripeStatus {
    Write-Host "🔍 检查Stripe CLI状态..." -ForegroundColor Blue
    
    try {
        # 检查版本
        $version = stripe --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Stripe CLI版本: $version" -ForegroundColor Green
        } else {
            throw "Stripe CLI not found"
        }
        
        # 检查登录状态
        $config = stripe config --list 2>$null
        if ($config -match "test_mode_api_key") {
            Write-Host "✅ 已登录Stripe账户" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️ 未登录Stripe账户" -ForegroundColor Yellow
            Write-Host "💡 请运行: stripe login" -ForegroundColor Cyan
            return $false
        }
    } catch {
        Write-Host "❌ Stripe CLI未安装或不在PATH中" -ForegroundColor Red
        Write-Host "💡 请从 https://stripe.com/docs/stripe-cli 下载并安装" -ForegroundColor Cyan
        return $false
    }
}

# 列出可用事件
function Show-AvailableEvents {
    Write-Host "📋 可用的通知事件:" -ForegroundColor Blue
    Write-Host "  1. subscription-created - 订阅创建通知" -ForegroundColor White
    Write-Host "  2. subscription-updated - 订阅更新通知" -ForegroundColor White
    Write-Host "  3. subscription-cancelled - 订阅取消通知" -ForegroundColor White
    Write-Host "  4. payment-succeeded - 支付成功通知" -ForegroundColor White
    Write-Host "  5. payment-failed - 支付失败通知" -ForegroundColor White
    Write-Host "  6. checkout-completed - 结账完成通知" -ForegroundColor White
    Write-Host ""
}

# 发送单个通知
function Send-SingleNotification {
    param([string]$Event)
    
    Write-Host "📢 发送通知: $Event" -ForegroundColor Blue
    Write-Host ""
    
    switch ($Event) {
        "subscription-created" {
            Write-Host "🎉 新订阅已创建！用户已成功订阅服务。" -ForegroundColor Green
            stripe trigger customer.subscription.created
        }
        "subscription-updated" {
            Write-Host "🔄 订阅已更新！用户订阅状态发生变化。" -ForegroundColor Yellow
            stripe trigger customer.subscription.updated
        }
        "subscription-cancelled" {
            Write-Host "❌ 订阅已取消！用户取消了订阅服务。" -ForegroundColor Red
            stripe trigger customer.subscription.deleted
        }
        "payment-succeeded" {
            Write-Host "💰 支付成功！订阅费用已成功收取。" -ForegroundColor Green
            stripe trigger invoice.payment_succeeded
        }
        "payment-failed" {
            Write-Host "⚠️ 支付失败！订阅费用收取失败。" -ForegroundColor Red
            stripe trigger invoice.payment_failed
        }
        "checkout-completed" {
            Write-Host "✅ 结账完成！用户已完成订阅流程。" -ForegroundColor Green
            stripe trigger checkout.session.completed
        }
        default {
            Write-Host "❌ 未知的事件类型: $Event" -ForegroundColor Red
            Write-Host ""
            Show-AvailableEvents
            return
        }
    }
    
    Write-Host ""
    Write-Host "✅ 通知发送完成！" -ForegroundColor Green
}

# 发送订阅生命周期通知
function Send-SubscriptionLifecycle {
    Write-Host "🔄 发送订阅生命周期通知..." -ForegroundColor Blue
    Write-Host ""
    
    $events = @(
        @{Name="checkout-completed"; Message="结账完成通知"},
        @{Name="subscription-created"; Message="订阅创建通知"},
        @{Name="payment-succeeded"; Message="支付成功通知"},
        @{Name="subscription-updated"; Message="订阅更新通知"},
        @{Name="subscription-cancelled"; Message="订阅取消通知"}
    )
    
    for ($i = 0; $i -lt $events.Count; $i++) {
        $event = $events[$i]
        Write-Host "[$($i + 1)/$($events.Count)] $($event.Message)..." -ForegroundColor Cyan
        
        switch ($event.Name) {
            "checkout-completed" { stripe trigger checkout.session.completed }
            "subscription-created" { stripe trigger customer.subscription.created }
            "payment-succeeded" { stripe trigger invoice.payment_succeeded }
            "subscription-updated" { stripe trigger customer.subscription.updated }
            "subscription-cancelled" { stripe trigger customer.subscription.deleted }
        }
        
        if ($i -lt $events.Count - 1) {
            Write-Host "⏳ 等待2秒..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host ""
    Write-Host "🎉 订阅生命周期通知发送完成！" -ForegroundColor Green
}

# 发送支付相关通知
function Send-PaymentNotifications {
    Write-Host "💰 发送支付相关通知..." -ForegroundColor Blue
    Write-Host ""
    
    $events = @(
        @{Name="payment-succeeded"; Message="支付成功通知"},
        @{Name="payment-failed"; Message="支付失败通知"},
        @{Name="payment-succeeded"; Message="支付成功通知"}
    )
    
    for ($i = 0; $i -lt $events.Count; $i++) {
        $event = $events[$i]
        Write-Host "[$($i + 1)/$($events.Count)] $($event.Message)..." -ForegroundColor Cyan
        
        switch ($event.Name) {
            "payment-succeeded" { stripe trigger invoice.payment_succeeded }
            "payment-failed" { stripe trigger invoice.payment_failed }
        }
        
        if ($i -lt $events.Count - 1) {
            Write-Host "⏳ 等待2秒..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host ""
    Write-Host "🎉 支付相关通知发送完成！" -ForegroundColor Green
}

# 显示状态信息
function Show-Status {
    Write-Host "📊 Stripe CLI状态:" -ForegroundColor Blue
    stripe --version
    Write-Host ""
    Write-Host "📋 配置信息:" -ForegroundColor Blue
    stripe config --list
}

# 主逻辑
if ($Help -or ($EventType -eq "" -and -not $List -and -not $Lifecycle -and -not $Payment -and -not $Status)) {
    Show-Help
    Show-AvailableEvents
    exit
}

# 检查Stripe CLI状态
if (-not (Test-StripeStatus)) {
    exit 1
}

Write-Host ""

# 根据参数执行相应操作
if ($List) {
    Show-AvailableEvents
} elseif ($Lifecycle) {
    Send-SubscriptionLifecycle
} elseif ($Payment) {
    Send-PaymentNotifications
} elseif ($Status) {
    Show-Status
} elseif ($EventType -ne "") {
    Send-SingleNotification -Event $EventType
} else {
    Show-Help
    Show-AvailableEvents
}

Write-Host ""
Write-Host "📋 下一步:" -ForegroundColor Yellow
Write-Host "  1. 检查应用日志中的webhook处理信息" -ForegroundColor White
Write-Host "  2. 运行 node scripts/check-user-status.js 检查用户状态" -ForegroundColor White
Write-Host "  3. 查看Stripe Dashboard中的事件日志" -ForegroundColor White
Write-Host ""

