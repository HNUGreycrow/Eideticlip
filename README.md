# EidetiClip - 剪贴板管理工具

## 📝 项目简介

EidetiClip 是一款基于 Electron 和 Vue 3 开发的剪贴板管理工具，它能够自动记录您复制的内容，让您随时查看和重用剪贴板历史记录。

## ✨ 主要特性

- **剪贴板历史记录**：自动保存您复制的文本内容，随时查看和重用
- **全局快捷键**：通过自定义快捷键快速访问剪贴板历史
- **系统托盘**：最小化到系统托盘，不干扰您的工作流程
- **主题切换**：支持亮色和暗色主题，保护您的眼睛

## 🔧 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI 组件库**：Element Plus
- **桌面应用框架**：Electron
- **数据存储**：SQLite (better-sqlite3)

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 重建 SQLite3 (如果需要)
npm run sqlite3-rebuild

# 启动开发服务器
npm run dev
```

### 构建应用

```bash
# 构建生产版本
npm run build
```

## 📦 项目结构

```
├── electron/              # Electron 主进程代码
│   ├── database/          # 数据库相关代码
│   ├── services/          # 主进程服务
│   ├── main.ts            # 主进程入口
│   └── preload.ts         # 预加载脚本
├── src/                   # 渲染进程代码 (Vue 应用)
│   ├── assets/            # 静态资源
│   ├── components/        # Vue 组件
│   ├── layout/            # 布局组件
│   ├── router/            # 路由配置
│   ├── styles/            # 样式文件
│   ├── utils/             # 工具函数
│   ├── views/             # 页面视图
│   └── main.ts            # 渲染进程入口
├── public/                # 公共资源
└── vite.config.ts         # Vite 配置
```

## 🔄 功能流程

1. 应用启动时初始化数据库和各项服务
2. 剪贴板服务监听系统剪贴板变化
3. 当检测到新的剪贴板内容时，保存到数据库并通知渲染进程
4. 用户可以通过界面或快捷键查看和管理剪贴板历史
5. 用户可以点击历史记录项将其恢复到系统剪贴板

## 📄 许可证

[MIT](./LICENSE)
