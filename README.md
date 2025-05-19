# Ghibli Dreamer

一个基于 Next.js 的图片风格转换应用，可以将普通图片转换成吉卜力动画风格。

## 环境要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn 包管理器

## 安装步骤

1. 克隆项目到本地
```bash
git clone [项目地址]
cd ghibli-img4
```

2. 安装依赖
```bash
npm install
# 或者使用 yarn
yarn install
```

3. 配置环境变量
创建 `.env.local` 文件在项目根目录，并添加必要的环境变量：
```env
# 示例环境变量
NEXT_PUBLIC_API_URL=your_api_url
```

4. 运行开发服务器
```bash
npm run dev
# 或者使用 yarn
yarn dev
```

5. 打开浏览器访问
```
http://localhost:3000
```

## 项目结构

```
ghibli-img4/
├── app/                # Next.js 应用主目录
│   ├── page.tsx       # 主页面
│   └── api/           # API 路由
├── public/            # 静态资源
│   ├── images/       # 图片资源
│   └── icons/        # 图标资源
├── styles/           # 样式文件
└── package.json      # 项目依赖配置
```

## 构建生产版本

```bash
npm run build
npm run start
# 或者使用 yarn
yarn build
yarn start
```

## 注意事项

1. 确保所有依赖都正确安装
2. 检查环境变量是否正确配置
3. 确保有足够的磁盘空间用于图片处理
4. 建议使用现代浏览器访问以获得最佳体验

## 常见问题

1. 如果遇到依赖安装问题，可以尝试删除 `node_modules` 文件夹和 `package-lock.json`，然后重新运行 `npm install`
2. 如果遇到端口占用问题，可以在 `package.json` 中修改启动端口
3. 确保图片资源路径正确，所有图片都应该放在 `public` 目录下

## 技术支持

如有问题，请联系：novum@gmail.com
