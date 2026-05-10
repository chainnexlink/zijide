# AIAssistant - 智能AI助手

## 项目概述

AIAssistant是一个基于Electron和React的智能AI助手软件，功能类似于Trae IDE助手。它集成了DeepSeek和豆包AI服务，提供智能对话、代码分析、文件处理等功能。

## 核心功能

### 🤖 智能对话
- 自然语言问答
- 代码生成和解释
- 技术文档分析
- 故障排查和解决方案

### 📁 文件分析
- 上传并分析各种文件
- 代码语法分析
- 文档内容理解
- 代码优化建议

### 🔧 工具集成
- 文件上传和管理
- 代码执行和测试
- 项目结构分析
- 技术架构建议

## 技术栈

- **Electron**：跨平台桌面应用
- **React 18**：现代化UI框架
- **TypeScript**：类型安全
- **Framer Motion**：流畅动画效果
- **DeepSeek API**：智能对话
- **豆包 API**：视觉分析

## 快速开始

### 安装依赖
```bash
cd AIAssistant
npm install
```

### 开发模式运行
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
npm start
```

### 生成安装包
```bash
# 构建Windows安装包
npm run dist:win

# 构建macOS安装包
npm run dist:mac

# 构建Linux安装包
npm run dist:linux
```

## 配置

### API密钥配置
API密钥已在 `src/main/ai/ai-service.ts` 中配置：
- **DeepSeek API**：`sk-8c66a43ed9844ddcbf1c582e38827a54`
- **豆包 API**：`ark-af37f3b8-ae56-4d6c-8713-67b36d40fad6-c7580`

### 自定义配置
可以在 `src/main/config.ts` 中修改其他配置参数。

## 功能特性

### 智能对话
- 支持多种编程语言的代码生成
- 技术问题的详细解答
- 上下文理解和多轮对话
- 代码优化和重构建议

### 文件分析
- 支持分析各种代码文件
- 识别代码结构和逻辑
- 检测潜在问题和错误
- 提供改进建议

### 用户界面
- 现代化深色主题
- 流畅的动画效果
- 响应式设计
- 友好的用户交互

## 系统要求

- **操作系统**：Windows 10+, macOS 10.15+, Linux
- **内存**：至少4GB RAM
- **存储空间**：至少100MB
- **网络**：需要互联网连接以使用AI服务

## 故障排除

### 常见问题
1. **API连接失败**：检查网络连接和API密钥配置
2. **应用启动缓慢**：首次启动需要加载依赖，后续会更快
3. **文件分析失败**：确保文件格式正确且大小适中

### 日志查看
应用日志保存在以下位置：
- Windows: `%APPDATA%\AIAssistant\logs`
- macOS: `~/Library/Logs/AIAssistant`
- Linux: `~/.config/AIAssistant/logs`

## 开发指南

### 项目结构
```
AIAssistant/
├── src/
│   ├── main/         # Electron主进程
│   └── renderer/      # React渲染进程
├── package.json       # 项目配置
└── tsconfig.json      # TypeScript配置
```

### 开发流程
1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 编写代码和测试
4. 构建生产版本：`npm run build`
5. 生成安装包：`npm run dist`

## 许可证

MIT License - 详见 LICENSE 文件

## 联系我们

如有问题或建议，请通过以下方式联系：
- 邮箱：support@aiassistant.com
- GitHub：https://github.com/aiassistant

---

**AIAssistant - 您的智能编程助手**