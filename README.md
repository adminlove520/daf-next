# DAF Next.js - 敏感词检测系统 (Vercel 无服务器版本)

基于 Next.js 15 + Vue 3 的全栈敏感词检测系统，可直接部署到 Vercel。

## ✨ 特性

- 🚀 **Vercel 无服务器架构** - 无需服务器管理，自动扩展
- 🎯 **高效检测** - 基于 Trie 树算法的中文敏感词检测
- 🔒 **JWT 认证** - 安全的用户认证和权限管理
- 📊 **完整功能** - 检测、过滤、词库管理、用户管理、日志分析
- 🎨 **Vue 3 前端** - 使用 Arco Design 组件库
- 🔐 **端到端加密** - 可选的请求/响应加密

## 📁 项目结构

```
daf-next/
├── app/                    # Next.js App Router (后端 API)
│   ├── api/v1/            # API 路由
│   │   ├── auth/          # 认证相关
│   │   ├── detect/        # 检测相关
│   │   ├── words/         # 词库管理
│   │   ├── users/         # 用户管理
│   │   ├── config/        # 配置管理
│   │   └── ...
│   ├── page.tsx           # 主页面
│   ├── layout.tsx         # 布局
│   └── views/             # Vue 组件 (从原项目复制)
├── lib/                   # 工具库
│   ├── db.ts             # 内存数据库 (可替换为 Vercel KV)
│   ├── auth.ts           # JWT 认证
│   └── detector.ts       # 敏感词检测引擎
├── src/                   # Vue 3 前端源码
│   ├── main.ts           # Vue 入口
│   ├── App.vue           # 根组件
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   ├── views/            # 页面组件
│   └── api/              # API 客户端
└── public/                # 静态资源
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行开发服务器

```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:api    # Next.js API (端口 3000)
npm run dev:client  # Vue 前端 (端口 3001)
```

### 3. 访问应用

- 前端: http://localhost:3001
- 后端 API: http://localhost:3000

### 4. 默认账号

- 管理员: `admin / admin123`
- 词库管理员: `word_manager / word123`

## 🔧 API 端点

### 认证
- `POST /api/v1/auth/login` - 登录
- `GET /api/v1/auth/me` - 获取当前用户
- `POST /api/v1/auth/change-password` - 修改密码
- `GET /api/v1/auth/login-logs` - 登录日志

### 检测
- `POST /api/v1/detect` - 文本检测
- `POST /api/v1/detect/all` - 全量检测
- `POST /api/v1/filter` - 文本过滤

### 词库
- `GET /api/v1/words` - 获取词库列表
- `POST /api/v1/words` - 添加词汇
- `DELETE /api/v1/words` - 删除词汇
- `DELETE /api/v1/words/clear` - 清空词库

### 分类
- `GET /api/v1/categories` - 获取分类

### 配置
- `GET /api/v1/config` - 获取配置
- `GET /api/v1/system/title` - 获取系统标题
- `POST /api/v1/config/update` - 更新配置
- `POST /api/v1/config/reload` - 重载配置

### 用户管理 (需要管理员权限)
- `GET /api/v1/users` - 用户列表
- `POST /api/v1/users` - 创建用户
- `PUT /api/v1/users/:id` - 更新用户
- `DELETE /api/v1/users/:id` - 删除用户

### 其他
- `GET /api/v1/health` - 健康检查

## 📦 部署到 Vercel

### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 部署

```bash
# 首次部署
vercel

# 生产环境部署
vercel --prod
```

### 4. 环境变量 (可选)

在 Vercel 控制台设置以下环境变量：

- `JWT_SECRET` - JWT 密钥 (默认使用随机值)
- `NODE_ENV` - 环境模式

## 🗄️ 数据持久化

当前版本使用内存存储。对于生产环境，建议集成：

1. **Vercel KV** - 键值存储
2. **Vercel Postgres** - 关系型数据库
3. **Upstash Redis** - Redis 缓存

## 🔄 从原项目迁移

如果你有原 DAF 项目，数据可以迁移：

```bash
# 1. 导出原项目的词库
# 2. 通过 API 导入到新系统
```

## 📝 开发说明

### 添加新的 API 端点

在 `app/api/v1/` 下创建新的路由文件：

```typescript
// app/api/v1/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({ success: true, data: {} });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // 处理逻辑
  return NextResponse.json({ success: true });
}
```

### 修改前端

Vue 组件位于 `src/views/` 和 `app/views/`，与原项目保持一致。

## 🧪 测试

```bash
# 测试健康检查
curl http://localhost:3000/api/v1/health

# 测试登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 测试检测
TOKEN="your_token_here"
curl -X POST http://localhost:3000/api/v1/detect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"测试文本"}'
```

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
