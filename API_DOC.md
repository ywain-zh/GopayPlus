# 前台 API 接口文档

> **Base URL**: `http://localhost:3000`（以实际部署地址为准）
>
> 本文档仅包含**前台用户**使用的接口，不包含管理后台（`/admin/*`）相关接口。

---

## 目录

- [1. 兑换码相关接口](#1-兑换码相关接口)
  - [1.1 使用兑换码](#11-使用兑换码)
  - [1.2 查询兑换码状态](#12-查询兑换码状态)
- [2. CDK 相关接口](#2-cdk-相关接口)
  - [2.1 验证 CDK](#21-验证-cdk)
  - [2.2 查询 CDK 状态](#22-查询-cdk-状态)
  - [2.3 下载产品文件](#23-下载产品文件)
- [3. WebSocket 实时推送](#3-websocket-实时推送)
  - [3.1 连接方式](#31-连接方式)
  - [3.2 订阅消息（客户端 → 服务端）](#32-订阅消息客户端--服务端)
  - [3.3 推送消息（服务端 → 客户端）](#33-推送消息服务端--客户端)
  - [3.4 兑换码任务推送](#34-兑换码任务推送)
  - [3.5 CDK 任务推送](#35-cdk-任务推送)
- [4. 错误处理](#4-错误处理)
- [5. 前端调用示例](#5-前端调用示例)
- [6. 业务流程图](#6-业务流程图)

---

## 1. 兑换码相关接口

### 1.1 使用兑换码

**POST** `/api/redeem`

使用兑换码发起 PayPal 充值请求。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 兑换码 |
| `amount` | number | ✅ | 充值金额（USD），必须为正数 |

#### 请求示例

```json
{
  "code": "ABC123",
  "amount": 50
}
```

#### 成功响应

```json
{
  "success": true,
  "data": {
    "approvalUrl": "https://www.paypal.com/checkoutnow?token=...",
    "orderId": "PAYPAL_ORDER_ID"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `data.approvalUrl` | string | PayPal 支付跳转链接 |
| `data.orderId` | string | PayPal 订单 ID |

#### 失败响应

| HTTP 状态码 | 错误信息 | 说明 |
|-------------|----------|------|
| 400 | `请输入兑换码` | 未提供兑换码 |
| 400 | `请输入有效的充值金额` | 金额无效或非正数 |
| 403 | `无效兑换码` | 兑换码不存在 |
| 403 | `该兑换码已使用` | 兑换码已被使用 |
| 500 | `PayPal 下单失败: ...` | PayPal API 调用失败 |

---

### 1.2 查询兑换码状态

**GET** `/api/redeem/status?code=xxx`

查询兑换码的当前状态和充值记录。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string (query) | ✅ | 兑换码 |

#### 成功响应

```json
{
  "success": true,
  "data": {
    "status": "已使用",
    "amount": 50,
    "createdAt": "2025-01-15 14:30:00",
    "usedAt": "2025-01-15 15:00:00",
    "paypalEmail": "user@example.com",
    "paypalOrderId": "PAYPAL_ORDER_ID"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | 状态：`未使用` / `已使用` |
| `data.amount` | number \| null | 充值金额（USD） |
| `data.createdAt` | string | 创建时间 |
| `data.usedAt` | string \| null | 使用时间 |
| `data.paypalEmail` | string \| null | PayPal 收款邮箱 |
| `data.paypalOrderId` | string \| null | PayPal 订单号 |

#### 失败响应

| HTTP 状态码 | 错误信息 | 说明 |
|-------------|----------|------|
| 400 | `请输入查询兑换码` | 未提供兑换码 |
| 404 | `未找到该兑换码记录` | 兑换码不存在 |

---

## 2. CDK 相关接口

### 2.1 验证 CDK

**POST** `/api/verify-cdk`

验证 CDK 是否有效且未使用。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cdk` | string | ✅ | CDK 激活码 |

#### 请求示例

```json
{
  "cdk": "CDK-XXXXX"
}
```

#### 成功响应

```json
{
  "success": true,
  "data": {
    "type": "自助"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.type` | string | CDK 类型：`自助` / `成品` |

#### 失败响应

| HTTP 状态码 | 错误信息 | 说明 |
|-------------|----------|------|
| 400 | `请输入 CDK` | 未提供 CDK |
| 403 | `该 CDK 已使用` | CDK 已被使用 |
| 403 | `无效 CDK` | CDK 不存在 |

---

### 2.2 查询 CDK 状态

**GET** `/api/cdk/query?cdk=xxx`

查询 CDK 的使用状态和产品信息。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cdk` | string (query) | ✅ | CDK 激活码 |

#### 成功响应

```json
{
  "success": true,
  "data": {
    "status": "已使用",
    "type": "成品",
    "createdAt": "2025-01-15 10:00:00",
    "usedAt": "2025-01-15 12:00:00",
    "imapKey": "imap_key_string",
    "downloadAvailable": true,
    "downloadFileName": "credentials_sub2api.json",
    "sub2apiAvailable": true,
    "sub2apiFileName": "credentials_sub2api.json",
    "cpaAvailable": true,
    "cpaFileName": "credentials_cpa.json"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | 状态：`未使用` / `已使用` |
| `data.type` | string | CDK 类型：`自助` / `成品` |
| `data.createdAt` | string | 创建时间 |
| `data.usedAt` | string \| null | 使用时间 |
| `data.imapKey` | string \| null | IMAP 密钥（成品类型） |
| `data.downloadAvailable` | boolean | 是否可下载（旧字段，等同 sub2apiAvailable） |
| `data.downloadFileName` | string \| null | 下载文件名（旧字段，等同 sub2apiFileName） |
| `data.sub2apiAvailable` | boolean | Sub2API 凭证是否可下载 |
| `data.sub2apiFileName` | string \| null | Sub2API 凭证文件名 |
| `data.cpaAvailable` | boolean | CPA 凭证是否可下载 |
| `data.cpaFileName` | string \| null | CPA 凭证文件名 |

#### 失败响应

| HTTP 状态码 | 错误信息 | 说明 |
|-------------|----------|------|
| 400 | `请输入查询激活码` | 未提供 CDK |
| 404 | `未找到该激活码记录` | CDK 不存在 |

---

### 2.3 下载产品文件

**GET** `/api/cdk/download?cdk=xxx&kind=sub2api`

下载已使用的「成品」类型 CDK 对应的凭证文件。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cdk` | string (query) | ✅ | CDK 激活码 |
| `kind` | string (query) | ❌ | 下载类型：`sub2api`（默认）/ `cpa` |

#### 成功响应

直接返回 JSON 文件下载（`Content-Disposition: attachment`）。

#### 失败响应

| HTTP 状态码 | 错误信息 | 说明 |
|-------------|----------|------|
| 400 | `Missing cdk` | 未提供 CDK |
| 400 | `Invalid download kind` | kind 参数无效 |
| 403 | `CDK not eligible for download` | CDK 无效/非成品类型/未使用 |
| 404 | `Credential file not found` | 凭证记录不存在 |
| 404 | `Credential file missing` | 凭证文件不在磁盘上 |

---

## 3. WebSocket 实时推送

服务端通过 WebSocket 提供任务状态的实时推送，前端可以在发起兑换/CDK 操作后订阅对应任务，实时获取处理进度。

### 3.1 连接方式

- **URL**: `ws://localhost:3000`（与 HTTP 服务同端口，自动升级为 WebSocket）
- **协议**: 原生 WebSocket（`ws` 库实现）
- **无需认证**: 直接连接即可

```javascript
const ws = new WebSocket('ws://localhost:3000');
```

---

### 3.2 订阅消息（客户端 → 服务端）

连接成功后，客户端发送 JSON 消息订阅某个任务的状态更新：

```json
{
  "type": "subscribe",
  "jobKey": "redeem_ABC123"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 固定为 `"subscribe"` |
| `jobKey` | string | ✅ | 任务标识，格式见下表 |

#### jobKey 格式

| 类型 | 格式 | 示例 | 说明 |
|------|------|------|------|
| 兑换码 | `redeem_{code}` | `redeem_ABC123` | 订阅兑换码充值任务 |
| CDK | `cdk_{code}` | `cdk_CDK-XXXXX` | 订阅 CDK 激活任务 |

> **说明**：
> - 订阅后服务端会立即推送一次当前快照（snapshot），包含任务的最新状态。
> - 同一连接可切换订阅不同 jobKey，切换时自动取消上一个订阅。
> - 连接断开时自动取消订阅。

---

### 3.3 推送消息（服务端 → 客户端）

所有服务端推送消息均遵循统一格式：

```json
{
  "type": "task_update",
  "jobKey": "redeem_ABC123",
  "data": {
    "status": "pending",
    "code": "ABC123",
    "message": "描述信息",
    // ... 其他字段
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 固定为 `"task_update"` |
| `jobKey` | string | 对应的任务标识 |
| `data` | object | 任务状态数据，字段因任务类型而异 |
| `data.status` | string | 任务状态（见下方各类型详细说明） |
| `data.code` | string | 兑换码或 CDK 码 |
| `data.message` | string | 人类可读的状态描述 |

---

### 3.4 兑换码任务推送

#### 状态流转

```
pending → completed
pending → failed
```

#### 各状态推送字段

**① `pending` — PayPal 订单已创建，等待支付**

```json
{
  "type": "task_update",
  "jobKey": "redeem_ABC123",
  "data": {
    "status": "pending",
    "code": "ABC123",
    "amount": 50,
    "paypal_order_id": "PAYPAL_ORDER_ID",
    "approval_url": "https://www.paypal.com/checkoutnow?token=...",
    "message": "PayPal 订单已创建，等待支付..."
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | `"pending"` |
| `data.code` | string | 兑换码 |
| `data.amount` | number | 充值金额（USD） |
| `data.paypal_order_id` | string | PayPal 订单号 |
| `data.approval_url` | string | PayPal 支付链接 |
| `data.message` | string | `"PayPal 订单已创建，等待支付..."` |

**② `completed` — 支付成功，充值完成**

```json
{
  "type": "task_update",
  "jobKey": "redeem_ABC123",
  "data": {
    "status": "completed",
    "code": "ABC123",
    "amount": 50,
    "paypal_email": "user@example.com",
    "paypal_order_id": "PAYPAL_ORDER_ID",
    "message": "支付成功，充值已完成！"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | `"completed"` |
| `data.code` | string | 兑换码 |
| `data.amount` | number | 实际充值金额 |
| `data.paypal_email` | string | 付款人 PayPal 邮箱 |
| `data.paypal_order_id` | string | PayPal 订单号 |
| `data.message` | string | `"支付成功，充值已完成！"` |

**③ `failed` — 处理失败**

```json
{
  "type": "task_update",
  "jobKey": "redeem_ABC123",
  "data": {
    "status": "failed",
    "code": "ABC123",
    "message": "PayPal 下单失败: 具体错误信息"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | `"failed"` |
| `data.code` | string | 兑换码 |
| `data.message` | string | 错误描述 |

#### 快照推送（订阅时立即返回）

订阅后服务端从数据库查询当前状态，推送完整快照：

```json
{
  "type": "task_update",
  "jobKey": "redeem_ABC123",
  "data": {
    "status": "completed",
    "code": "ABC123",
    "amount": 50,
    "paypal_email": "user@example.com",
    "paypal_order_id": "PAYPAL_ORDER_ID",
    "created_at": "2025-01-15T06:30:00.000Z",
    "used_at": "2025-01-15T07:00:00.000Z",
    "captured_at": "2025-01-15T07:00:05.000Z",
    "message": "充值已完成"
  }
}
```

| 额外字段 | 类型 | 说明 |
|----------|------|------|
| `data.created_at` | string \| null | 兑换码创建时间 |
| `data.used_at` | string \| null | 使用时间 |
| `data.captured_at` | string \| null | PayPal 扣款确认时间 |

---

### 3.5 CDK 任务推送

#### 状态流转

```
processing → completed
processing → failed
```

#### 各状态推送字段

**① `processing` — CDK 正在处理中**

```json
{
  "type": "task_update",
  "jobKey": "cdk_CDK-XXXXX",
  "data": {
    "status": "processing",
    "code": "CDK-XXXXX",
    "cdkType": "自助",
    "message": "正在处理 CDK..."
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | `"processing"` |
| `data.code` | string | CDK 码 |
| `data.cdkType` | string | CDK 类型：`自助` / `成品` |
| `data.message` | string | `"正在处理 CDK..."` |

**② `completed`（自助类型）— 产品分配成功**

```json
{
  "type": "task_update",
  "jobKey": "cdk_CDK-XXXXX",
  "data": {
    "status": "completed",
    "code": "CDK-XXXXX",
    "cdkType": "自助",
    "message": "自助产品分配成功"
  }
}
```

**③ `completed`（成品类型）— 成品领取成功**

```json
{
  "type": "task_update",
  "jobKey": "cdk_CDK-XXXXX",
  "data": {
    "status": "completed",
    "code": "CDK-XXXXX",
    "cdkType": "成品",
    "imapKey": "imap_key_string",
    "sub2apiAvailable": true,
    "sub2apiFileName": "credentials_sub2api.json",
    "cpaAvailable": true,
    "cpaFileName": "credentials_cpa.json",
    "message": "成品领取成功"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | `"completed"` |
| `data.code` | string | CDK 码 |
| `data.cdkType` | string | `"成品"` |
| `data.imapKey` | string \| null | IMAP 密钥 |
| `data.sub2apiAvailable` | boolean | Sub2API 凭证是否可下载 |
| `data.sub2apiFileName` | string \| null | Sub2API 凭证文件名 |
| `data.cpaAvailable` | boolean | CPA 凭证是否可下载 |
| `data.cpaFileName` | string \| null | CPA 凭证文件名 |
| `data.message` | string | `"成品领取成功"` |

**④ `failed` — 处理失败**

```json
{
  "type": "task_update",
  "jobKey": "cdk_CDK-XXXXX",
  "data": {
    "status": "failed",
    "code": "CDK-XXXXX",
    "message": "库存不足，请联系客服"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `data.status` | string | `"failed"` |
| `data.code` | string | CDK 码 |
| `data.message` | string | 错误描述（如 `"库存不足，请联系客服"` / `"CDK 处理失败: ..."`） |

#### 快照推送（订阅时立即返回）

```json
{
  "type": "task_update",
  "jobKey": "cdk_CDK-XXXXX",
  "data": {
    "status": "completed",
    "code": "CDK-XXXXX",
    "cdkType": "成品",
    "created_at": "2025-01-15T02:00:00.000Z",
    "used_at": "2025-01-15T04:00:00.000Z",
    "imapKey": "imap_key_string",
    "sub2apiAvailable": true,
    "sub2apiFileName": "credentials_sub2api.json",
    "cpaAvailable": true,
    "cpaFileName": "credentials_cpa.json",
    "message": "CDK 已使用"
  }
}
```

| 额外字段 | 类型 | 说明 |
|----------|------|------|
| `data.created_at` | string \| null | CDK 创建时间 |
| `data.used_at` | string \| null | CDK 使用时间 |

---

## 4. 错误处理

所有 HTTP 接口的错误响应均遵循统一格式：

```json
{
  "success": false,
  "message": "错误描述"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 固定为 `false` |
| `message` | string | 错误原因描述 |

> **注意**：下载接口 (`/api/cdk/download`) 的错误响应为纯文本，非 JSON 格式。

---

## 5. 前端调用示例

### HTTP 接口 — JavaScript (Fetch API)

```javascript
// 1. 使用兑换码
async function redeemCode(code, amount) {
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, amount })
  });
  const data = await res.json();
  if (data.success) {
    window.location.href = data.data.approvalUrl; // 跳转 PayPal 支付
  } else {
    alert(data.message);
  }
}

// 2. 查询兑换码状态
async function checkRedeemStatus(code) {
  const res = await fetch(`/api/redeem/status?code=${encodeURIComponent(code)}`);
  return await res.json();
}

// 3. 验证 CDK
async function verifyCDK(cdk) {
  const res = await fetch('/api/verify-cdk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cdk })
  });
  return await res.json();
}

// 4. 查询 CDK 状态
async function queryCDK(cdk) {
  const res = await fetch(`/api/cdk/query?cdk=${encodeURIComponent(cdk)}`);
  return await res.json();
}

// 5. 下载产品文件
function downloadProduct(cdk, kind = 'sub2api') {
  window.open(`/api/cdk/download?cdk=${encodeURIComponent(cdk)}&kind=${kind}`);
}
```

### HTTP 接口 — cURL

```bash
# 使用兑换码
curl -X POST http://localhost:3000/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","amount":50}'

# 查询兑换码状态
curl "http://localhost:3000/api/redeem/status?code=ABC123"

# 验证 CDK
curl -X POST http://localhost:3000/api/verify-cdk \
  -H "Content-Type: application/json" \
  -d '{"cdk":"CDK-XXXXX"}'

# 查询 CDK 状态
curl "http://localhost:3000/api/cdk/query?cdk=CDK-XXXXX"

# 下载产品文件（Sub2API）
curl -O "http://localhost:3000/api/cdk/download?cdk=CDK-XXXXX&kind=sub2api"

# 下载产品文件（CPA）
curl -O "http://localhost:3000/api/cdk/download?cdk=CDK-XXXXX&kind=cpa"
```

### WebSocket — JavaScript

```javascript
// 1. 订阅兑换码任务状态
function watchRedeemTask(code, onUpdate) {
  const ws = new WebSocket(`ws://${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      jobKey: `redeem_${code}`
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'task_update') {
      onUpdate(msg.data);
      // 终态时可关闭连接
      if (msg.data.status === 'completed' || msg.data.status === 'failed') {
        ws.close();
      }
    }
  };

  ws.onerror = (err) => console.error('WebSocket error:', err);
  ws.onclose = () => console.log('WebSocket closed');

  return ws;
}

// 2. 订阅 CDK 任务状态
function watchCDKTask(cdk, onUpdate) {
  const ws = new WebSocket(`ws://${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      jobKey: `cdk_${cdk}`
    }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'task_update') {
      onUpdate(msg.data);
      if (msg.data.status === 'completed' || msg.data.status === 'failed') {
        ws.close();
      }
    }
  };

  ws.onerror = (err) => console.error('WebSocket error:', err);
  ws.onclose = () => console.log('WebSocket closed');

  return ws;
}

// 3. 完整示例：兑换并实时监听
async function redeemAndWatch(code, amount) {
  // 先发起兑换
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, amount })
  });
  const result = await res.json();

  if (!result.success) {
    console.error('兑换失败:', result.message);
    return;
  }

  // 订阅状态推送
  watchRedeemTask(code, (data) => {
    console.log(`[${data.status}] ${data.message}`);

    if (data.status === 'completed') {
      console.log('充值完成！PayPal:', data.paypal_email);
    }
  });

  // 跳转支付
  window.open(result.data.approvalUrl);
}
```

### WebSocket — wscat（命令行调试）

```bash
# 安装 wscat
npm install -g wscat

# 连接 WebSocket
wscat -c ws://localhost:3000

# 连接后发送订阅消息（手动输入）
{"type":"subscribe","jobKey":"redeem_ABC123"}
```

---

## 6. 业务流程图

### 兑换码充值流程

```
用户输入兑换码 + 金额
        │
        ▼
  POST /api/redeem
        │
        ├── 失败 → 返回错误信息
        │         （WebSocket 推送 status: failed）
        │
        └── 成功 → 返回 PayPal 支付链接
                │  （WebSocket 推送 status: pending）
                │
                ▼
        用户跳转 PayPal 完成支付
                │
                ▼
        PayPal 回调确认
                │  （WebSocket 推送 status: completed）
                │
                ▼
      GET /api/redeem/status → 查询充值结果
```

### CDK 兑换流程

```
用户输入 CDK
      │
      ▼
POST /api/verify-cdk ← 验证有效性
      │
      ├── 无效/已用 → 提示错误
      │
      └── 有效 → 发起激活
              │  （WebSocket 推送 status: processing）
              │
              ├── 失败 → 返回错误
              │         （WebSocket 推送 status: failed）
              │
              └── 成功（WebSocket 推送 status: completed）
                      │
                      ▼
            GET /api/cdk/query ← 查询详情
                      │
                      ├── 自助类型 → 显示状态信息
                      │
                      └── 成品类型 → 显示下载选项
                              │
                              ▼
                    GET /api/cdk/download ← 下载凭证
                         (kind=sub2api / cpa)
```
