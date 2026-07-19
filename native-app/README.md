# WarRescue Native

WarRescue 的 React Native / Expo 主应用。网页端和管理后台仍保留在仓库根目录，手机端不再通过 WebView 加载网页。

## 本地运行

```bash
npm install
npm start
```

真机定位、APNs/FCM 推送和 SOS 测试请使用 development build；Expo Go 不支持本项目所需的完整远程推送能力。

Supabase 默认连接现有 WarRescue 项目，也可以复制 `.env.example` 为 `.env.local` 后覆盖公开客户端配置。

## 验证与原生工程

```bash
npm run typecheck
npx expo-doctor
npx expo prebuild --platform ios
```

iOS 原生工程由 CI 在构建时生成，避免旧 Capacitor 工程再次成为发布来源。
