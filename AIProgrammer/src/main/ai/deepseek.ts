import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class DeepSeekService {
  private config: DeepSeekConfig;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    this.config = {
      apiKey: 'sk-8c66a43ed9844ddcbf1c582e38827a54',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: 2000,
      temperature: 0.7
    };
  }

  async chat(message: string, context: ChatMessage[] = []): Promise<{ response: string; error?: string }> {
    try {
      if (!this.config.apiKey) {
        return {
          response: '',
          error: 'DeepSeek API密钥未配置。请在设置中配置您的API密钥。'
        };
      }

      const messages = [
        {
          role: 'system',
          content: `你是AIProgrammer，一个智能编程助手。你擅长：
1. 根据自然语言描述生成代码
2. 解释和分析代码逻辑
3. 发现代码问题并提供优化建议
4. 回答编程相关问题
5. 支持多种编程语言（Python, JavaScript, TypeScript, Java, C++, Go, Rust等）

请提供准确、实用的回答，并在适当时候给出代码示例。`
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
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
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
      
      if (error.response?.status === 401) {
        return { response: '', error: 'API密钥无效或已过期。请检查您的DeepSeek API密钥。' };
      }
      
      if (error.response?.status === 429) {
        return { response: '', error: '请求过于频繁，请稍后再试。' };
      }

      return { 
        response: '', 
        error: `DeepSeek API错误: ${error.response?.data?.error?.message || error.message}` 
      };
    }
  }

  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.config.model = model;
  }
}
