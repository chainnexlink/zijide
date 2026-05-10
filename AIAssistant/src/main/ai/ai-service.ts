import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIConfig {
  deepseek: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  doubao: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
}

export class AIService {
  private config: AIConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    this.config = {
      deepseek: {
        apiKey: 'sk-8c66a43ed9844ddcbf1c582e38827a54',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      },
      doubao: {
        apiKey: 'ark-af37f3b8-ae56-4d6c-8713-67b36d40fad6-c7580',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'ep-20260424192625-tvkwg'
      }
    };
  }

  async chat(message: string, context: ChatMessage[] = []): Promise<{ response: string; error?: string }> {
    try {
      const messages = [
        {
          role: 'system',
          content: `你是AIAssistant，一个智能AI助手，类似于Trae IDE助手。你需要：
1. 理解用户的问题和需求
2. 提供专业、准确的回答
3. 在编程相关问题上提供代码示例
4. 保持友好、专业的语气
5. 帮助用户解决各种技术问题

你擅长：
- 代码生成和解释
- 技术文档分析
- 软件架构设计
- 故障排查
- 项目管理建议`
        },
        ...context.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await axios.post(
        `${this.config.deepseek.baseUrl}/chat/completions`,
        {
          model: this.config.deepseek.model,
          messages,
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.deepseek.apiKey}`
          },
          timeout: 30000
        }
      );

      const assistantMessage = response.data.choices[0]?.message?.content || '';
      
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: Date.now()
      });

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now()
      });

      return { response: assistantMessage };
    } catch (error: any) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      return { 
        response: '', 
        error: `AI服务错误: ${error.response?.data?.error?.message || error.message}` 
      };
    }
  }

  async analyzeFile(filePath: string, analysisType: string): Promise<{ analysis: string; error?: string }> {
    try {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      const messages = [
        {
          role: 'system',
          content: `你是一个专业的代码分析师。请分析以下文件内容，并根据分析类型提供详细的分析报告。`
        },
        {
          role: 'user',
          content: `请分析以下文件内容（分析类型：${analysisType}）：\n\n${fileContent}`
        }
      ];

      const response = await axios.post(
        `${this.config.deepseek.baseUrl}/chat/completions`,
        {
          model: this.config.deepseek.model,
          messages,
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.deepseek.apiKey}`
          },
          timeout: 30000
        }
      );

      const analysis = response.data.choices[0]?.message?.content || '';
      return { analysis };
    } catch (error: any) {
      console.error('File Analysis Error:', error);
      return { 
        analysis: '', 
        error: `文件分析失败: ${error.message}` 
      };
    }
  }

  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  setApiKeys(deepseekKey: string, doubaoKey: string): void {
    this.config.deepseek.apiKey = deepseekKey;
    this.config.doubao.apiKey = doubaoKey;
  }
}
