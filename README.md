# Resume Pilot

AI 简历筛选助手 —— 一款 Boss 直聘 Chrome 插件，帮助招聘者在聊天页面快速提取、分析和评估候选人简历。

## 功能特性

- **简历自动提取** — 在 Boss 直聘聊天页面自动识别并提取候选人简历内容，支持 iframe 嵌入简历与滚动捕获
- **AI 智能分析** — 调用大语言模型对简历进行结构化分析，生成候选人评估摘要
- **悬浮面板** — 通过 Shadow DOM 注入的悬浮面板展示分析结果，支持拖拽移动，不干扰原页面样式
- **简历原文查看** — 可展开查看完整简历原文
- **本地缓存** — 已分析的简历结果缓存至 Chrome Storage，避免重复请求
- **设置页面** — 在 Options 页配置 API Key 及模型参数

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite + @crxjs/vite-plugin |
| 样式 | Tailwind CSS 4 |
| 运行环境 | Chrome Extension Manifest V3 |

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm

### 安装与开发

```bash
# 克隆仓库
git clone https://github.com/abangzhu/resume-pilot.git
cd resume-pilot

# 安装依赖
pnpm install

# 启动开发服务
pnpm dev
```

### 加载插件

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目根目录下的 `dist` 文件夹

### 构建生产版本

```bash
pnpm build
```

## 项目结构

```
src/
├── background/      # Service Worker（后台脚本）
│   ├── capture.ts   # 简历抓取逻辑
│   ├── index.ts     # 入口 & 消息路由
│   └── llm.ts       # LLM 调用封装
├── content/         # Content Script（注入页面）
│   ├── App.vue      # 悬浮面板主组件
│   ├── components/  # 面板子组件
│   ├── extractor.ts # 简历文本提取
│   └── index.ts     # 入口 & Shadow DOM 挂载
├── options/         # Options 页面（设置）
│   ├── App.vue
│   └── pages/       # 设置子页面
├── popup/           # Popup 弹出页
│   └── App.vue
├── shared/          # 公共模块
│   ├── constants.ts # 常量定义
│   ├── messaging.ts # 消息通信
│   ├── types.ts     # 类型定义
│   └── utils.ts     # 工具函数
└── manifest.ts      # Chrome 扩展清单
```

## 使用说明

1. 在 Options 页面配置你的 LLM API Key
2. 打开 Boss 直聘聊天页面 (`zhipin.com/web/chat/*`)
3. 插件自动检测并提取候选人简历
4. 悬浮面板显示 AI 分析结果，可拖拽调整位置
5. 点击「简历原文」查看完整简历内容

## 协议

[MIT](./LICENSE)
