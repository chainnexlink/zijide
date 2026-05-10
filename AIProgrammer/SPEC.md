# AIProgrammer - 智能编程助手

## 1. 项目概述

**项目名称**：AIProgrammer
**项目类型**：Electron桌面应用
**核心功能**：集成DeepSeek大语言模型对话系统和豆包视觉AI图片识别功能的智能编程助手
**目标用户**：开发者、程序员、软件工程师

## 2. 核心功能模块

### 2.1 AI对话系统（DeepSeek集成）
- **智能代码生成**：根据自然语言描述生成代码
- **代码解释与分析**：解释代码功能、分析逻辑
- **代码审查**：检测代码问题和优化建议
- **技术问答**：回答编程相关问题
- **多语言支持**：支持Python、JavaScript、TypeScript、Java、C++等主流语言

### 2.2 图片识别系统（豆包集成）
- **UI截图分析**：识别界面截图并生成对应代码
- **架构图识别**：分析架构图并生成项目结构
- **流程图转换**：将流程图转换为代码逻辑
- **代码截图识别**：识别截图中的代码并进行修改

### 2.3 代码编辑器
- **多标签编辑**：支持多个文件同时编辑
- **语法高亮**：支持所有主流编程语言
- **代码补全**：基于AI的智能代码补全
- **文件管理**：项目文件树形管理

### 2.4 项目管理
- **项目创建与导入**：创建新项目或导入现有代码
- **文件导航**：快速定位和搜索文件
- **版本控制集成**：Git基本操作支持

## 3. 技术架构

### 3.1 前端技术栈
- **Electron**：跨平台桌面应用框架
- **React 18**：UI框架
- **TypeScript**：类型安全
- **Tailwind CSS**：样式框架
- **Monaco Editor**：代码编辑器核心
- **Framer Motion**：动画效果

### 3.2 后端与AI集成
- **DeepSeek API**：大语言模型对话
- **豆包视觉API**：图片识别与分析
- **Electron IPC**：主进程与渲染进程通信

### 3.3 系统架构图
```
┌─────────────────────────────────────────┐
│           Electron 主进程                │
│  ┌──────────┐  ┌──────────────────┐   │
│  │ 窗口管理  │  │ AI服务管理器      │   │
│  └──────────┘  │ - DeepSeek对话    │   │
│  ┌──────────┐  │ - 豆包图片识别    │   │
│  │ 系统托盘  │  └──────────────────┘   │
│  └──────────┘  ┌──────────────────┐   │
│  ┌──────────┐  │ 文件系统管理      │   │
│  │ 应用菜单  │  └──────────────────┘   │
│  └──────────┘                          │
└─────────────────────────────────────────┘
              │ IPC通信
┌─────────────────────────────────────────┐
│          Electron 渲染进程              │
│  ┌──────────────────────────────────┐   │
│  │         React 应用               │   │
│  │  ┌────────┐  ┌──────────────┐   │   │
│  │  │AI对话  │  │ 图片上传识别  │   │   │
│  │  │组件    │  │ 组件         │   │   │
│  │  └────────┘  └──────────────┘   │   │
│  │  ┌────────────────────────────┐ │   │
│  │  │     Monaco代码编辑器       │ │   │
│  │  └────────────────────────────┘ │   │
│  │  ┌────────────────────────────┐ │   │
│  │  │     项目文件管理器         │ │   │
│  │  └────────────────────────────┘ │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 4. AI服务集成方案

### 4.1 DeepSeek对话系统
```typescript
// AI服务配置
interface DeepSeekConfig {
  apiKey: string;           // API密钥
  baseUrl: string;          // API地址
  model: string;            // 模型名称
  maxTokens: number;        // 最大Token数
  temperature: number;      // 生成温度
}

// 对话消息格式
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// 对话上下文管理
class ConversationContext {
  messages: ChatMessage[];
  maxHistory: number;       // 最大历史消息数
}
```

### 4.2 豆包图片识别系统
```typescript
// 图片识别配置
interface DoubaoVisionConfig {
  apiKey: string;           // API密钥
  baseUrl: string;          // API地址
  model: string;            // 视觉模型
  maxImageSize: number;     // 最大图片大小(MB)
}

// 图片识别请求
interface ImageAnalysisRequest {
  image: string;            // Base64编码的图片
  prompt: string;           // 分析提示词
  mode: 'ui' | 'code' | 'architecture' | 'flowchart';
}

// 图片识别响应
interface ImageAnalysisResponse {
  description: string;      // 图片描述
  generatedCode?: string;   // 生成的代码
  suggestions?: string[];   // 建议
}
```

## 5. 核心模块设计

### 5.1 主进程模块（main/）
```
main/
├── index.ts              # 应用入口
├── window.ts             # 窗口管理
├── menu.ts               # 应用菜单
├── tray.ts               # 系统托盘
├── ipc.ts                # IPC处理器
├── ai/
│   ├── deepseek.ts       # DeepSeek服务
│   ├── doubao.ts         # 豆包视觉服务
│   └── index.ts          # AI服务导出
├── file/
│   ├── project.ts        # 项目管理
│   └── filesystem.ts     # 文件操作
└── utils/
    ├── logger.ts         # 日志工具
    └── config.ts         # 配置管理
```

### 5.2 渲染进程模块（renderer/）
```
renderer/
├── index.html            # HTML入口
├── index.tsx             # React入口
├── App.tsx               # 根组件
├── components/
│   ├── Chat/             # AI对话组件
│   │   ├── ChatPanel.tsx
│   │   ├── MessageBubble.tsx
│   │   └── InputArea.tsx
│   ├── ImageAnalyzer/    # 图片分析组件
│   │   ├── ImageUploader.tsx
│   │   ├── AnalysisResult.tsx
│   │   └── ImagePreview.tsx
│   ├── Editor/           # 代码编辑器组件
│   │   ├── CodeEditor.tsx
│   │   ├── FileTree.tsx
│   │   └── TabBar.tsx
│   └── common/           # 通用组件
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Loading.tsx
├── hooks/                # 自定义Hook
├── services/             # 服务层
├── stores/               # 状态管理
└── styles/               # 样式文件
```

### 5.3 共享模块（shared/）
```
shared/
├── types/                # 类型定义
├── constants/           # 常量定义
└── utils/               # 工具函数
```

## 6. 依赖配置

### 6.1 package.json
```json
{
  "name": "ai-programmer",
  "version": "1.0.0",
  "description": "AI智能编程助手 - 基于DeepSeek和豆包",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "electron .",
    "build": "electron-builder",
    "start": "electron ."
  },
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@monaco-editor/react": "^4.6.0",
    "framer-motion": "^10.16.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "electron-builder": "^24.9.0",
    "electron-webpack": "^2.8.2"
  }
}
```

## 7. API密钥配置

### 7.1 环境变量配置
```env
# DeepSeek配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 豆包配置
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-vision
```

## 8. 界面设计

### 8.1 主界面布局
```
┌────────────────────────────────────────────────────┐
│  菜单栏                                              │
├────────────┬───────────────────────────────────────┤
│            │                                       │
│  侧边栏    │          主工作区                      │
│  ┌──────┐ │  ┌─────────────────────────────────┐  │
│  │对话  │ │  │                                 │  │
│  ├──────┤ │  │                                 │  │
│  │图片  │ │  │      代码编辑器/对话窗口        │  │
│  │识别  │ │  │                                 │  │
│  ├──────┤ │  │                                 │  │
│  │项目  │ │  └─────────────────────────────────┘  │
│  │文件  │ │  ┌─────────────────────────────────┐  │
│  ├──────┤ │  │  AI对话输入/图片上传区          │  │
│  │设置  │ │  └─────────────────────────────────┘  │
│  └──────┘ │                                       │
│            │                                       │
├────────────┴───────────────────────────────────────┤
│  状态栏：API连接状态 | 当前项目 | Token使用         │
└────────────────────────────────────────────────────┘
```

### 8.2 视觉风格
- **主题**：深色主题（适合长时间编码）
- **主色调**：#1E293B（深蓝灰）
- **强调色**：#3B82F6（蓝色）
- **成功色**：#10B981（绿色）
- **警告色**：#F59E0B（橙色）
- **错误色**：#EF4444（红色）

## 9. 功能流程

### 9.1 AI对话流程
1. 用户在输入框输入问题
2. 前端将消息发送到主进程
3. 主进程调用DeepSeek API
4. 获取响应后返回给渲染进程
5. 在对话区域显示AI回复
6. 自动保存对话历史

### 9.2 图片识别流程
1. 用户上传图片或粘贴截图
2. 前端进行图片预处理和压缩
3. 发送图片到主进程
4. 主进程调用豆包视觉API
5. 获取分析结果
6. 显示识别结果和生成代码

## 10. 安全考虑

### 10.1 API密钥保护
- API密钥存储在系统安全存储中
- 不在代码中硬编码敏感信息
- 使用环境变量或配置文件

### 10.2 隐私保护
- 对话数据本地存储
- 图片不上传到不必要的服务器
- 提供数据清除功能

## 11. 性能优化

### 11.1 加载优化
- 代码分割，减少初始加载时间
- 图片懒加载
- 对话历史分页加载

### 11.2 交互优化
- AI响应显示打字机效果
- 图片识别进度指示
- 代码补全即时响应

## 12. 后续扩展功能

### 12.1 短期规划
- [ ] 实现基础对话功能
- [ ] 实现图片上传和识别
- [ ] 集成Monaco编辑器
- [ ] 实现文件项目管理

### 12.2 长期规划
- [ ] 代码自动补全
- [ ] 项目模板生成
- [ ] Git集成
- [ ] 插件系统

## 13. 开发计划

### 第一阶段：项目搭建（1-2天）
- [ ] 初始化Electron项目
- [ ] 配置React + TypeScript
- [ ] 设置构建工具

### 第二阶段：核心功能（3-5天）
- [ ] DeepSeek对话集成
- [ ] 豆包图片识别集成
- [ ] 基础UI组件开发

### 第三阶段：编辑器功能（2-3天）
- [ ] Monaco编辑器集成
- [ ] 文件管理系统
- [ ] 项目导入导出

### 第四阶段：优化完善（2-3天）
- [ ] 性能优化
- [ ] UI细节打磨
- [ ] 错误处理完善

## 14. 总结

AIProgrammer将打造一个功能强大、易用的智能编程助手，通过集成DeepSeek大语言模型和豆包视觉AI，为开发者提供全方位的编程支持。项目采用现代化的技术栈和架构设计，确保良好的用户体验和可扩展性。