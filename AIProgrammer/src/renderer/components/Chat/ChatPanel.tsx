import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Trash2, Copy, CheckCheck } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 你好！我是AIProgrammer，你的智能编程助手。我可以帮助你：\n\n• 根据自然语言生成代码\n• 解释和分析代码逻辑\n• 发现代码问题并提供优化建议\n• 回答编程相关问题\n\n有什么我可以帮你的吗？',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const result = await window.electronAPI.ai.chat(
        inputValue.trim(),
        messages.map(m => ({ role: m.role, content: m.content }))
      );

      if (result.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ 错误: ${result.error}`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>AI对话</h2>
        <motion.button
          className="clear-btn"
          onClick={handleClear}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 size={18} />
          <span>清空</span>
        </motion.button>
      </div>

      <div className="chat-messages">
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

      <div className="chat-input-area">
        <textarea
          className="chat-input"
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
        .chat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--color-bg-primary);
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-bg-secondary);
        }

        .chat-header h2 {
          font-size: 18px;
          font-weight: 600;
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .clear-btn:hover {
          background-color: var(--color-bg-tertiary);
          color: var(--color-error);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .message {
          display: flex;
          gap: 16px;
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
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--color-bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .message.user .message-avatar {
          background-color: var(--color-primary);
        }

        .message-content {
          position: relative;
          flex: 1;
        }

        .message-text {
          padding: 16px;
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          border-top-left-radius: 4px;
          line-height: 1.6;
        }

        .message.user .message-text {
          background-color: var(--color-primary);
          border-top-left-radius: var(--radius-lg);
          border-top-right-radius: 4px;
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
          background-color: var(--color-bg-tertiary);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          cursor: pointer;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .message-content:hover .copy-btn {
          opacity: 1;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 16px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background-color: var(--color-primary);
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
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .chat-input-area {
          display: flex;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--color-border);
          background-color: var(--color-bg-secondary);
        }

        .chat-input {
          flex: 1;
          padding: 12px 16px;
          background-color: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-size: 14px;
          resize: none;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .chat-input:focus {
          border-color: var(--color-primary);
        }

        .chat-input::placeholder {
          color: var(--color-text-muted);
        }

        .send-btn {
          width: 48px;
          height: 48px;
          background-color: var(--color-primary);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color var(--transition-fast);
        }

        .send-btn:hover:not(:disabled) {
          background-color: var(--color-primary-dark);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ChatPanel;
