---
name: meoo-vision-ai
description: >
  实现AI视觉理解能力。实现“看懂图片”类 AI功能时使用。基于qwen3-vl-plus视觉大模型，输入图片（URL 或 Meoo Cloud存储桶URL），输出结构化文本分析，支持多轮对话历史和流式输出。通过 Edge Function 服务端代理统一鉴权。任何AI应用开发需求时，需要理解图片都需要用到
  【BLOCKING】MUST BE loaded before enable Meoo Cloud service
---

# Meoo 视觉理解能力集成

在 Meoo 项目中接入"看懂图片"类 AI 能力的标准指南。覆盖单次图片分析和多轮图文对话两种模式。

## 技能定位

本技能处理所有与图片理解相关的 AI 场景，包含两种使用模式：

**模式一：单次图片分析** — 用户提交一张图片和一个问题，AI 返回文本分析结果。

典型目标：图片内容描述、物体与场景识别、视觉问答、OCR 文字识别、图片风格/构图/色彩分析。

**模式二：多轮图文对话** — 用户围绕图片连续追问，中间可穿插新图片，AI 记住上下文。

典型目标：图文混合聊天、连续追问图片细节、多张图片逐一讨论、带视觉上下文的 AI 助手。

> 文字生成图片用 `meoo-image-gen-ai`，纯文本用 `meoo-llm-ai`。

## 前置检查（阻断性）

**Meoo Cloud Service 是所有 AI 能力的必要前提。Cloud 未成功启用时，禁止生成任何 Edge Function 或 AI 接入代码。**

1. 调用 `CloudEnableTool` 检查当前项目的 Cloud 状态。
2. 如果 Cloud 已开启 → 继续后续步骤。
3. 如果 Cloud 未开启 → 调用 `CloudEnableTool` 引导用户开启。
4. **以下任一情况，立即终止，拒绝生成任何 Edge Function 或 AI 接入代码：**
   - `CloudEnableTool` 工具不可用
   - `CloudEnableTool` 调用失败 / Cloud 启动过程报错
   - 用户主动拒绝启用 Cloud Service
5. 终止时统一提示：**「请先成功启用 Meoo Cloud Service，然后再尝试使用 Meoo 模型服务。」**
6. 不得在 Cloud 未成功启用的状态下编写任何边缘函数代码，即使用户要求也必须拒绝并说明原因。

## 凭证与接口

Meoo AI 域名：`https://api.meoo.host`

服务 AK **不写在前端**，由 Edge Function 从环境变量 `MEOO_PROJECT_API_KEY` 读取。

接口路径（Edge Function 内部使用）：

```
POST /meoo-ai/compatible-mode/v1/chat/completions
```

请求头：

```http
Authorization: Bearer <MEOO_PROJECT_API_KEY>
Content-Type: application/json
```

## 模型

`qwen3-vl-plus`

视觉理解只支持这一个模型，不需要做模型选择。GPT-4V、Claude Vision、Gemini Vision 等外部模型不可用。

## 输入图片限制与压缩（必须）

**所有用户上传的图片在传给 API 之前，必须经过压缩处理。**

### 输入图片硬限制

| 限制项 | 值 |
|--------|-----|
| 格式 | JPEG、JPG、PNG、BMP、WEBP |
| 分辨率 | 宽高各 ≤ 8000 像素，最小边 ≥ 10 像素 |
| 宽高比 | [1:8, 8:1] |
| 文件大小 | ≤ 1MB |

### 压缩工具函数

```ts
/**
 * 智能压缩图片，确保符合 API 输入限制
 * 返回压缩后的 File 对象，可直接上传到存储桶
 */
export async function compressImage(
  file: File,
  options?: {
    maxSizeMB?: number;        // 默认 1
    maxWidthOrHeight?: number; // 默认 8000
    quality?: number;          // 初始质量 0-1，默认 0.85
    outputFormat?: 'image/jpeg' | 'image/webp'; // 默认 image/webp
  }
): Promise<File> {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 8000,
    quality = 0.85,
    outputFormat = 'image/webp',
  } = options || {};

  const maxBytes = maxSizeMB * 1024 * 1024;

  // 如果已经符合限制，直接返回
  if (file.size <= maxBytes) {
    const img = await loadImage(file);
    if (img.width <= maxWidthOrHeight && img.height <= maxWidthOrHeight) {
      return file;
    }
  }

  const img = await loadImage(file);
  let { width, height } = img;

  // 缩放超大图片
  if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
    const scale = Math.min(maxWidthOrHeight / width, maxWidthOrHeight / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  // 递减质量直到文件大小达标
  let currentQuality = quality;
  while (currentQuality > 0.1) {
    const blob = await canvasToBlob(canvas, outputFormat, currentQuality);
    if (blob.size <= maxBytes) {
      const ext = outputFormat === 'image/webp' ? 'webp' : 'jpg';
      return new File([blob], `compressed.${ext}`, { type: outputFormat });
    }
    currentQuality -= 0.1;
  }

  const blob = await canvasToBlob(canvas, outputFormat, 0.1);
  const ext = outputFormat === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `compressed.${ext}`, { type: outputFormat });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      type, quality
    );
  });
}
```

### 压缩调用时机

- **上传到存储桶之前**：`const compressed = await compressImage(file); await uploadImageForVision(compressed);`
- **强约束**：禁止跳过压缩直接上传原图

## 请求格式

### 单次图片分析

content 必须使用数组格式，组合 `text` 和 `image_url` 两种类型：

```json
{
  "model": "qwen3-vl-plus",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "这张图片里有什么？" },
      { "type": "image_url", "image_url": { "url": "https://example.com/photo.jpg" } }
    ]
  }]
}
```

### 多轮图文对话

通过 messages 数组中的完整历史维持上下文。`content` 可以是纯字符串（纯文本轮次）或数组（图文混合轮次）。

```json
{
  "model": "qwen3-vl-plus",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "这张图片里有什么？" },
        { "type": "image_url", "image_url": { "url": "https://example.com/cat.jpg" } }
      ]
    },
    { "role": "assistant", "content": "图片里有一只橘色的猫，正坐在窗台上晒太阳。" },
    { "role": "user", "content": "它是什么品种？看起来多大了？" },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "再看看这张，是同一只猫吗？" },
        { "type": "image_url", "image_url": { "url": "https://example.com/cat2.jpg" } }
      ]
    }
  ]
}
```

`content` 格式由该轮是否包含图片决定，不需要统一。

### 图片输入方式

**URL 方式**（图片已在线上）：

```json
{ "type": "image_url", "image_url": { "url": "https://example.com/photo.jpg" } }
```

**Meoo Cloud 存储桶方式**（用户上传本地图片时强制使用）：

用户上传的本地图片必须先压缩、再上传到 Meoo Cloud `images` 存储桶获取 public URL。

## Edge Function 服务端模板

文件位置：`/functions/ai-vision/index.ts`

支持两种入参模式：`{ text, imageUrl }` 用于单次分析，`{ messages }` 用于多轮对话。

```ts
const MEOO_AI_BASE_URL = 'https://api.meoo.host';
const MEOO_PROJECT_SERVICE_AK = Deno.env.get('MEOO_PROJECT_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const stream = body.stream ?? true;
    let messages;

    if (body.messages) {
      messages = body.messages;
    } else {
      const { text, imageUrl } = body;
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }];
    }

    const response = await fetch(
      `${MEOO_AI_BASE_URL}/meoo-ai/compatible-mode/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'qwen3-vl-plus', messages, stream }),
      }
    );

    // 转发上游 HTTP 状态码，不吞掉 4xx/5xx
    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(errorBody, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!stream) {
      // 非流式：直接转发 JSON 响应
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 流式：转发 SSE 流
    const reader = response.body!.getReader();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

部署：`CloudDeployFunction({ functionName: "ai-vision", verifyJwt: true })`

## 前端调用方式

### Fetch 流式调用（默认，推荐）

所有场景默认使用流式调用，避免长文本分析时 HTTP 超时。

```ts
import { getSupabaseUrl, getSupabaseAnonKey } from 'src/supabase/client.ts';

type TextContent = { type: 'text'; text: string };
type ImageContent = { type: 'image_url'; image_url: { url: string } };
type VisionContent = TextContent | ImageContent;
type VisionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | VisionContent[];
};

export async function requestVisionStream(
  messages: VisionMessage[],
  onChunk: (text: string) => void,
  options?: { signal?: AbortSignal }
) {
  const { signal } = options ?? {};

  const response = await fetch(
    `${getSupabaseUrl()}/functions/v1/ai-vision`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSupabaseAnonKey()}`,
      },
      body: JSON.stringify({ messages, stream: true }),
      signal,
    }
  );
  if (!response.ok) throw new Error(`请求失败: ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return fullText;

        try {
          const json = JSON.parse(payload);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // 忽略非法 JSON 行
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return fullText;
    throw err;
  }

  return fullText;
}
```

**调用示例：**

```ts
// 基础流式调用
let result = '';
await requestVisionStream(
  [{ role: 'user', content: [
    { type: 'text', text: '这张图片里有什么？' },
    { type: 'image_url', image_url: { url: publicUrl } },
  ]}],
  (chunk) => { result += chunk; updateUI(result); }
);

// 带中止控制
const controller = new AbortController();
await requestVisionStream(
  messages,
  (chunk) => { result += chunk; updateUI(result); },
  { signal: controller.signal }
);
// 需要取消时
controller.abort();
```

### SDK 非流式调用（仅限短文本、不需要实时输出的场景）

`supabase.functions.invoke` 不支持流式读取，仅在确定响应极短且明确不需要逐字输出时使用。

#### 单次分析

```ts
import { supabase } from 'src/supabase/client.ts';

export async function requestVision(text: string, imageUrl: string) {
  const { data, error } = await supabase.functions.invoke('ai-vision', {
    body: { text, imageUrl, stream: false },
  });
  if (error) throw error;
  return data;
}
```

#### 多轮对话

```ts
export async function requestVisionChat(messages: VisionMessage[]) {
  const { data, error } = await supabase.functions.invoke('ai-vision', {
    body: { messages, stream: false },
  });
  if (error) throw error;
  return data;
}
```

> **注意：** 非流式调用在长文本分析时容易触发 HTTP 超时（Edge Function 默认 60s）。除非响应可控地短，否则一律使用流式。

### 对话历史管理

```ts
const conversationHistory: VisionMessage[] = [];

export async function chat(userContent: string | VisionContent[]) {
  conversationHistory.push({ role: 'user', content: userContent });
  let result = '';
  await requestVisionStream(
    conversationHistory,
    (chunk) => { result += chunk; }
  );
  conversationHistory.push({ role: 'assistant', content: result });
  return result;
}
```

### 历史长度控制

```ts
const MAX_HISTORY_LENGTH = 20;

function trimHistory(messages: VisionMessage[]) {
  if (messages.length <= MAX_HISTORY_LENGTH) return messages;
  const systemMessages = messages.filter(m => m.role === 'system');
  const recentMessages = messages.filter(m => m.role !== 'system').slice(-MAX_HISTORY_LENGTH);
  return [...systemMessages, ...recentMessages];
}
```

## 用户图片上传与存储（Meoo Cloud）

用户上传的本地图片必须**先压缩、再上传到 Meoo Cloud 存储桶**获取 public URL。

### 前置依赖

- `@supabase/supabase-js`（项目已有）
- `base64-arraybuffer`（文件上传必需）

### 数据库与存储结构

通过 `CloudApplyMigration` 创建：

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE POLICY "Allow anonymous uploads" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'images');
CREATE POLICY "Allow anonymous select" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'images');
CREATE POLICY "Allow anonymous delete" ON storage.objects
  FOR DELETE TO anon USING (bucket_id = 'images');

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON public.images
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

### 上传代码模板

```ts
import { supabase } from 'src/supabase/client.ts';
import { decode } from 'base64-arraybuffer';

export async function uploadImageForVision(file: File): Promise<{
  publicUrl: string;
  storagePath: string;
  metadata: Record<string, unknown>;
}> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `uploads/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, decode(base64), { contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(storagePath);

  const { data, error: insertError } = await supabase
    .from('images')
    .insert({
      filename: fileName,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      public_url: publicUrl,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return { publicUrl, storagePath, metadata: data };
}
```

### 完整调用示例

```ts
// 1. 压缩 → 2. 上传 → 3. 用 public URL 调用 API
const compressed = await compressImage(file);
const { publicUrl } = await uploadImageForVision(compressed);
const result = await requestVision('描述这张图片', publicUrl);

// 多轮对话
const compressed = await compressImage(file);
const { publicUrl } = await uploadImageForVision(compressed);
await chat([
  { type: 'text', text: '这张图片里有什么？' },
  { type: 'image_url', image_url: { url: publicUrl } },
]);
```

### 查询与删除

```ts
export async function listImages() {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// 删除顺序：先删存储文件，再删元数据
export async function deleteImage(id: string, storagePath: string) {
  await supabase.storage.from('images').remove([storagePath]);
  const { error } = await supabase.from('images').delete().eq('id', id);
  if (error) throw error;
}
```

## SSE 流式协议要点

响应 Content-Type 为 `text/event-stream`。每条数据以 `data: ` 前缀开头，以双换行 `\n\n` 结尾。`data` 内容是 JSON 对象，结构与非流式一致，但用 `choices[0].delta` 替代 `choices[0].message`，`delta.content` 为本次增量文本片段。流结束标志为 `data: [DONE]`。

### SSE 关键注意事项

**buffer 拼接是必须的。** 网络传输可能将一条完整的 `data:` 行切割到两个 chunk 中。必须用 buffer 做行级拼接，不能逐 chunk 直接按行解析，否则会丢失被截断的消息。

**错误处理分两层。** HTTP 层面的错误（如 401、500）通过 `response.ok` 判断，在流开始前就能捕获。流传输过程中的中断通过 `reader.read()` 抛出的异常或 `done` 状态处理。用户主动取消时 `AbortError` 应静默处理，不作为业务错误上报。

**不要用 EventSource。** Edge Function 需要 POST + 自定义 Authorization Header，而浏览器原生 `EventSource` 只支持 GET 请求，无法满足需求。必须用 `fetch` + `ReadableStream` 手动解析 SSE。

**中止流的正确方式：** 通过 `AbortController` 传入 `requestVisionStream` 的 `signal` 参数。

## 执行步骤

1. 确认需求属于图片理解范畴（不是生成图片、不是纯文本）。
2. 判断是单次分析还是多轮对话。
3. 定位落点：图片已在哪里展示？在那个位置附近增加分析入口。
4. 检查 Cloud 功能是否开启（未开启则停止）。
5. 确定图片来源：线上 URL 直接用，本地上传的先 `compressImage()` → 再上传存储桶。
6. 如需存储，按上方章节创建存储桶和元数据表。
7. 创建或复用 Edge Function（`ai-vision`）。
8. 部署：`CloudDeployFunction({ functionName: "ai-vision", verifyJwt: true })`
9. 前端通过 supabase SDK 或 fetch 调用。
10. 默认使用流式调用，仅极短文本场景可选非流式。
11. 单次模式：完成请求接入、结果展示、错误处理。
12. 多轮模式：实现对话历史管理、历史长度控制。
13. 完成 loading、error 状态处理。

## 规则与约束

### 必须（MUST）

- Cloud 功能必须已成功启用才能继续（启动失败或用户拒绝均视为未启用，禁止生成 Edge Function）
- AK 存放在 Edge Function 环境变量，禁止硬编码在前端
- 用户上传图片必须先 `compressImage()` 压缩至 ≤ 1MB 再上传，禁止跳过压缩
- 上传存储桶必须用 `base64-arraybuffer` 的 `decode()` + ArrayBuffer，禁止 Blob/File/FormData
- 带图片的轮次 content 必须使用数组格式（不是纯字符串），纯文本轮次可用字符串
- 多轮对话必须维护完整 messages 历史
- Edge Function 必须处理 CORS（OPTIONS）、try-catch、转发上游状态码
- 部署后生效——代码修改必须重新 `CloudDeployFunction`
- 删除图片：先删存储文件，再删元数据

### 禁止（MUST NOT）

- 不使用任何第三方图像识别 SDK 或 API
- 不因接入视觉 AI 而做无关的工程改造（不重建目录、不新建无关页面/路由）

### 默认（DEFAULT）

- 模型固定 `qwen3-vl-plus`
- 默认流式输出
- 通过 Edge Function 调用，使用 supabase SDK
- 多轮对话默认维护完整对话历史
- 前端默认 fetch 流式调用；仅短文本非流式场景可用 supabase SDK

## 异常处理

- Cloud 未开启 / 启动失败 / 用户拒绝启用 → 立即停止所有 AI 集成工作，提示「请先成功启用 Meoo Cloud Service，然后再尝试使用 Meoo 模型服务」，拒绝生成任何边缘函数代码
- 需求是生成图片 → 引导用 `meoo-image-gen-ai`
- 需求是纯文本 → 引导用 `meoo-llm-ai`
- Edge Function 部署失败 → 检查 `MEOO_PROJECT_API_KEY`
- 请求 401 → 检查 AK 读取
- 图片过大超时 → 确认 `compressImage()` 是否正确调用
- 对话历史过长 → 使用 `trimHistory` 裁剪

## 产出清单

基础（必须）：

- `/functions/ai-vision/index.ts`（Edge Function）
- `src/services/meooVision.ts`（前端封装 + compressImage + requestVisionStream）
- `src/components/ai/VisionAnalyzer.tsx` 或 `VisionChat.tsx`

如需图片上传存储：

- 上传代码 + 存储桶 migration

## 完成标准

- Cloud 功能已开启
- Edge Function 已部署，AK 从环境变量读取
- 前端通过 supabase SDK 调用 Edge Function
- 图片输入和文本分析输出正常工作（默认流式输出）
- 图片输入经过 `compressImage()` 压缩
- 多轮模式下上下文连贯
- 对话历史正确维护（多轮模式）
- 具备 loading、error 状态处理
- 代码只涉及视觉理解功能本身
