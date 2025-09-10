# Stripe 订阅 - 前端接入流程（基于当前代码）

本流程基于现有的 Next.js 15 App Router 与页面 `app/page.tsx` 的升级模态框，实现“从前端发起订阅升级”和“进入客户自助订阅管理门户（Customer Portal）”。

## 1. 前提与环境

- 环境变量（前端可用）
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`（仅在需要 Stripe.js 时）
  - `APP_BASE_URL`（可选，用于回跳展示状态）
- 后端 API（需先实现，详见订阅开发计划）
  - `POST /api/billing/checkout` 创建 Checkout Session
  - `POST /api/billing/portal` 创建 Billing Portal Session

说明：本前端流程不直接使用 Secret Key，所有敏感操作均由后端完成。

## 2. 交互路径

1) 用户在首页打开“升级”模态框（已存在于 `app/page.tsx`）
2) 用户点击某个套餐的“选择此套餐”按钮
3) 前端携带 JWT 调用 `/api/billing/checkout` 并传入 `plan`（`basic|pro|enterprise`）
4) 后端返回 `session.url`
5) 前端 `window.location.href = url` 跳转至 Stripe 收银台
6) 支付完成后根据 `success_url` 返回站点，展示成功提示并刷新用户状态
7) 用户可通过“管理订阅”入口跳转 `/api/billing/portal` 到 Stripe Portal 自助管理

## 3. 接口调用封装

在 `app/page.tsx` 内新增两个调用函数（或抽离到 `app/lib/billing.ts`）：

```ts
async function startCheckout(plan: 'basic' | 'pro' | 'enterprise') {
  const token = localStorage.getItem('jwt');
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
  if (data.url) window.location.href = data.url;
}

async function openPortal() {
  const token = localStorage.getItem('jwt');
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to open portal');
  if (data.url) window.location.href = data.url;
}
```

## 4. UI 接入点

- 升级模态框中“选择此套餐”按钮绑定：

```tsx
<button
  className="w-full mt-3 bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
  onClick={() => startCheckout(key.toLowerCase() as 'basic'|'pro'|'enterprise')}
>
  选择此套餐
</button>
```

- 在头像菜单或设置区域新增“管理订阅”入口：

```tsx
<button onClick={openPortal} className="text-sm text-gray-700 hover:bg-gray-100 w-full text-left px-4 py-2">
  管理订阅
</button>
```

## 5. 成功/取消落地页处理

- 后端创建 Checkout Session 时配置：
  - `success_url = ${APP_BASE_URL}/?billing=success`
  - `cancel_url = ${APP_BASE_URL}/?billing=cancel`
- 前端在 `app/page.tsx` 中使用 `useEffect` 检查 `window.location.search`：

```ts
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const billing = params.get('billing');
  if (billing === 'success') {
    // 展示成功提示，并刷新本地用户状态（从后端拉取或等待 webhook 更新后手动刷新）
  } else if (billing === 'cancel') {
    // 展示取消提示
  }
}, []);
```

## 6. 错误与边界

- 无 JWT：拦截并提示登录
- 接口失败：展示错误提示（来自后端的 message）
- 重复点击：按钮 loading 状态防抖
- 未配置 Price：后端返回 400，前端给出“暂不可用”提示

## 7. 本地测试要点

- 需先完成后端接口及 Webhook，并确保用户模型能反映订阅状态
- 通过 Stripe 测试卡（4242 4242 4242 4242）完成一笔订阅
- 回站后验证前端展示与提示是否合理

## 8. 最小改动原则

- 不改动已实现的免费试用体验
- 升级入口与提示以非侵入式集成
- 订阅状态以本地轻提示为主，持久状态由后端与 Webhook 维护
