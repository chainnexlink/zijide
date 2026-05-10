import axios from 'axios';

export interface DoubaoVisionConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxImageSize: number;
}

export interface ImageAnalysisResult {
  description: string;
  generatedCode?: string;
  suggestions?: string[];
  confidence?: number;
}

export type AnalysisMode = 'ui' | 'code' | 'architecture' | 'flowchart';

export class DoubaoVisionService {
  private config: DoubaoVisionConfig;

  constructor() {
    this.config = {
      apiKey: 'ark-af37f3b8-ae56-4d6c-8713-67b36d40fad6-c7580',
      baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      model: 'ep-20260424192625-tvkwg',
      maxImageSize: 10
    };
  }

  async analyzeImage(
    imageBase64: string, 
    prompt: string, 
    mode: AnalysisMode = 'ui'
  ): Promise<{ result?: ImageAnalysisResult; error?: string }> {
    try {
      if (!this.config.apiKey) {
        return {
          error: '豆包API密钥未配置。请在设置中配置您的API密钥。'
        };
      }

      const systemPrompts = {
        ui: `你是一个专业的UI/UX设计师和前端开发工程师。请分析这张界面截图：
1. 描述界面的整体布局和设计风格
2. 识别界面中的主要元素（导航栏、按钮、输入框、列表等）
3. 提取界面的配色方案
4. 生成对应的HTML/CSS代码（使用Tailwind CSS）
5. 如果是移动端界面，使用适当的移动端适配样式`,

        code: `你是一个专业的代码审查专家。请分析这张代码截图：
1. 识别代码使用的编程语言
2. 解释代码的主要功能和逻辑
3. 指出代码中可能存在的问题
4. 提供代码优化建议
5. 如果可以，补充完整的代码示例`,

        architecture: `你是一个资深的系统架构师。请分析这张架构图：
1. 识别系统的整体架构类型（微服务、单体、云原生等）
2. 描述系统的核心组件和它们之间的关系
3. 分析数据流向和处理流程
4. 识别可能的技术栈和框架
5. 提供架构优化或改进建议`,

        flowchart: `你是一个流程分析和自动化专家。请分析这张流程图：
1. 识别流程的起点和终点
2. 描述流程的主要步骤和决策点
3. 分析流程中的并行和串行操作
4. 将流程转换为伪代码或编程语言代码
5. 提出流程优化建议`
      };

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                },
                {
                  type: 'text',
                  text: `请分析这张图片。\n\n分析模式: ${mode}\n\n${systemPrompts[mode]}\n\n用户提示: ${prompt || '请详细分析这张图片并提供相关代码和建議。'}`
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      
      const result = this.parseAnalysisResult(content, mode);
      
      return { result };
    } catch (error: any) {
      console.error('Doubao Vision API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        return { error: 'API密钥无效或已过期。请检查您的豆包API密钥。' };
      }
      
      if (error.response?.status === 429) {
        return { error: '请求过于频繁，请稍后再试。' };
      }

      if (error.code === 'ECONNABORTED') {
        return { error: '图片分析超时，请尝试使用更小的图片。' };
      }

      return { 
        error: `豆包视觉API错误: ${error.response?.data?.error?.message || error.message}` 
      };
    }
  }

  private parseAnalysisResult(content: string, mode: AnalysisMode): ImageAnalysisResult {
    const result: ImageAnalysisResult = {
      description: content
    };

    if (mode === 'ui' || mode === 'code') {
      const codeMatch = content.match(/```(?:html|css|javascript|jsx|tsx|python|java|cpp|c|go|rust)?\n([\s\S]*?)```/);
      if (codeMatch) {
        result.generatedCode = codeMatch[1].trim();
      }

      const suggestionMatch = content.match(/(?:建议|建议列表|Recommendations)[:：]\s*([\s\S]*?)(?:\n\n|$)/i);
      if (suggestionMatch) {
        result.suggestions = suggestionMatch[1]
          .split(/[\n•\-*]/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
    }

    const confidenceMatch = content.match(/(?:置信度|可信度|Confidence)[:：]?\s*(\d+(?:\.\d+)?%?)/i);
    if (confidenceMatch) {
      const confidenceValue = confidenceMatch[1].replace('%', '');
      result.confidence = parseFloat(confidenceValue) / 100;
    }

    return result;
  }

  async uploadImage(imagePath: string): Promise<{ url?: string; error?: string }> {
    try {
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString('base64');
      return { url: `data:image/jpeg;base64,${base64}` };
    } catch (error: any) {
      return { error: `图片读取失败: ${error.message}` };
    }
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.config.model = model;
  }
}
