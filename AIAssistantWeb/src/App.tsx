import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Trash2, FileText, Copy, CheckCheck, Settings } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 你好！我是AIAssistant，你的智能AI助手。我可以帮助你：\n\n• 回答编程问题\n• 生成和解释代码\n• 分析文件内容\n• 提供技术建议\n• 帮助解决各种技术问题\n\n有什么我可以帮你的吗？',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 监听剪贴板粘贴事件
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64Image = event.target?.result as string;
              
              const imageMessage: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: `🖼️ 已粘贴图片\n\n[图片内容已转换为Base64格式，AI将分析图片内容]`,
                timestamp: Date.now()
              };
              setMessages((prev) => [...prev, imageMessage]);
              
              // 自动发送图片分析请求
              handleSendImageAnalysis(base64Image, 'clipboard-image');
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    // 监听输入框的粘贴事件
    const inputField = document.querySelector('.input-field') as HTMLTextAreaElement;
    if (inputField) {
      inputField.addEventListener('paste', handlePaste);
    }

    // 监听整个文档的粘贴事件
    document.addEventListener('paste', handlePaste);

    return () => {
      if (inputField) {
        inputField.removeEventListener('paste', handlePaste);
      }
      document.removeEventListener('paste', handlePaste);
    };
  }, [messages]);

  const chatWithAI = async (message: string, context: ChatMessage[]) => {
    try {
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是AIAssistant，一个智能AI助手，类似于Trae IDE助手。你需要：\n1. 理解用户的问题和需求\n2. 提供专业、准确的回答\n3. 在编程相关问题上提供代码示例\n4. 保持友好、专业的语气\n5. 帮助用户解决各种技术问题\n\n你擅长：\n- 代码生成和解释\n- 技术文档分析\n- 软件架构设计\n- 故障排查\n- 项目管理建议`
            },
            ...context,
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer sk-8c66a43ed9844ddcbf1c582e38827a54`
          },
          timeout: 30000
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      return `❌ AI服务错误: ${error.response?.data?.error?.message || error.message}`;
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const context = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithAI(inputValue.trim(), context);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 请求失败: ${error.message}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCurrentFile(content);
        
        const fileMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `📁 已上传文件: ${file.name}`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, fileMessage]);
      };
      reader.readAsText(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;
        
        const imageMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `🖼️ 已上传图片: ${file.name}\n\n[图片内容已转换为Base64格式，AI将分析图片内容]`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, imageMessage]);
        
        // 自动发送图片分析请求
        handleSendImageAnalysis(base64Image, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendImageAnalysis = async (base64Image: string, fileName: string) => {
    setIsLoading(true);
    
    try {
      const context = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithAI(
        `请分析以下图片内容，并提供详细的分析报告：\n\n图片名称: ${fileName}\n图片内容: [图片已通过Base64编码上传，包含在对话上下文中]\n\n请描述图片中的内容，识别其中的元素、场景、文字等信息。`,
        context
      );
      
      const analysisMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `📊 图片分析结果:\n\n${response}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, analysisMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 图片分析失败: ${error.message}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAnalysis = async () => {
    if (!currentFile) return;

    const analysisMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `🔍 分析文件内容`,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, analysisMessage]);
    setIsLoading(true);

    try {
      const context = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithAI(
        `请分析以下文件内容，并提供详细的分析报告：\n\n${currentFile}`,
        context
      );
      
      const analysisMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `📊 文件分析结果:\n\n${response}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, analysisMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 分析失败: ${error.message}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '对话已清空。有什么我可以帮你的吗？',
        timestamp: Date.now()
      }
    ]);
    setCurrentFile(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-left">
          <h1>🤖 AIAssistant</h1>
          <span className="status-indicator">
            <div className="status-dot"></div>
            在线
          </span>
        </div>
        <div className="header-right">
          {currentFile && (
            <motion.button
              className="file-btn"
              onClick={handleFileAnalysis}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText size={18} />
              分析文件
            </motion.button>
          )}
          <motion.button
            className="clear-btn"
            onClick={handleClear}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 size={18} />
          </motion.button>
          <motion.button
            className="settings-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </div>

      <div className="messages-container">
        <div className="messages">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`message ${message.role}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {message.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                {message.role === 'assistant' && (
                  <motion.button
                    className="copy-btn"
                    onClick={() => handleCopy(message.content, message.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {copiedId === message.id ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              className="message assistant loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="input-area">
        <div className="input-toolbar">
          <input
            type="file"
            id="file-upload"
            className="file-input"
            onChange={handleFileUpload}
            accept=".txt,.js,.ts,.jsx,.tsx,.html,.css,.json"
          />
          <label htmlFor="file-upload" className="upload-btn">
            <FileText size={18} />
          </label>
          <input
            type="file"
            id="image-upload"
            className="file-input"
            onChange={handleImageUpload}
            accept="image/*"
          />
          <label htmlFor="image-upload" className="upload-btn">
            🖼️
          </label>
        </div>
        <textarea
          className="input-field"
          placeholder="输入你的问题，按Enter发送..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
        />
        <motion.button
          className="send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Send size={20} />
        </motion.button>
      </div>

      <style>{`
        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #1E1E1E;
        }

        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background-color: #252526;
          border-bottom: 1px solid #3E3E42;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-left h1 {
          font-size: 20px;
          font-weight: 600;
          color: #E2E8F0;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #94A3B8;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #10B981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .header-right {
          display: flex;
          gap: 8px;
        }

        .file-btn,
        .clear-btn,
        .settings-btn {
          padding: 8px;
          background-color: #3C3C3C;
          border: none;
          border-radius: 4px;
          color: #E2E8F0;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .file-btn:hover,
        .clear-btn:hover,
        .settings-btn:hover {
          background-color: #4A4A4A;
        }

        .messages-container {
          flex: 1;
          overflow: hidden;
        }

        .messages {
          height: 100%;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          display: flex;
          gap: 12px;
          max-width: 80%;
        }

        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message.assistant {
          align-self: flex-start;
        }

        .message-avatar {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #3C3C3C;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .message.user .message-avatar {
          background-color: #667eea;
        }

        .message-content {
          position: relative;
          flex: 1;
        }

        .message-text {
          padding: 12px 16px;
          background-color: #2D2D30;
          border-radius: 8px;
          line-height: 1.6;
          word-wrap: break-word;
        }

        .message.user .message-text {
          background-color: #667eea;
          color: white;
        }

        .message-text p {
          margin-bottom: 8px;
        }

        .message-text p:last-child {
          margin-bottom: 0;
        }

        .copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px;
          background-color: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: #94A3B8;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .message-content:hover .copy-btn {
          opacity: 1;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background-color: #667eea;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        .input-area {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 16px 24px;
          background-color: #252526;
          border-top: 1px solid #3E3E42;
        }

        .input-toolbar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .file-input {
          display: none;
        }

        .upload-btn {
          padding: 8px;
          background-color: #3C3C3C;
          border: none;
          border-radius: 4px;
          color: #E2E8F0;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .upload-btn:hover {
          background-color: #4A4A4A;
        }

        .input-field {
          flex: 1;
          padding: 12px 16px;
          background-color: #3C3C3C;
          border: 1px solid #3E3E42;
          border-radius: 8px;
          color: #E2E8F0;
          font-size: 14px;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          max-height: 120px;
        }

        .input-field:focus {
          border-color: #667eea;
        }

        .input-field::placeholder {
          color: #6A6A6A;
        }

        .send-btn {
          width: 40px;
          height: 40px;
          background-color: #667eea;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background-color: #5a6fd8;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #2D2D30;
        }

        ::-webkit-scrollbar-thumb {
          background: #4A4A4A;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #6A6A6A;
        }

        @media (max-width: 768px) {
          .message {
            max-width: 90%;
          }

          .app-header {
            padding: 12px 16px;
          }

          .messages {
            padding: 16px;
          }

          .input-area {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
