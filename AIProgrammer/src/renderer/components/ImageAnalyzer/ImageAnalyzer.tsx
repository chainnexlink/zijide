import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Code, Wand2, Copy, CheckCheck, X } from 'lucide-react';

type AnalysisMode = 'ui' | 'code' | 'architecture' | 'flowchart';

const ImageAnalyzer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [mode, setMode] = useState<AnalysisMode>('ui');
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    description: string;
    generatedCode?: string;
    suggestions?: string[];
    confidence?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setSelectedImage(base64);
        setImageName(file.name);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setSelectedImage(base64);
        setImageName(file.name);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await window.electronAPI.ai.analyzeImage(
        selectedImage,
        prompt,
        mode
      );

      if (response.error) {
        setError(response.error);
      } else if (response.result) {
        setResult(response.result);
      }
    } catch (err: any) {
      setError(`分析失败: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyCode = async () => {
    if (result?.generatedCode) {
      await navigator.clipboard.writeText(result.generatedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImageName('');
    setResult(null);
    setError(null);
    setPrompt('');
  };

  const modeOptions: { id: AnalysisMode; label: string; icon: any; desc: string }[] = [
    { id: 'ui', label: 'UI分析', icon: ImageIcon, desc: '分析界面截图并生成代码' },
    { id: 'code', label: '代码识别', icon: Code, desc: '识别截图中的代码' },
    { id: 'architecture', label: '架构分析', icon: Wand2, desc: '分析系统架构图' },
    { id: 'flowchart', label: '流程转换', icon: Wand2, desc: '将流程图转换为代码' }
  ];

  return (
    <div className="image-analyzer">
      <div className="analyzer-header">
        <h2>图片识别分析</h2>
      </div>

      <div className="analyzer-content">
        <div className="upload-section">
          <div
            className={`upload-area ${selectedImage ? 'has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <div className="image-preview">
                <img
                  src={`data:image/jpeg;base64,${selectedImage}`}
                  alt="Preview"
                />
                <button className="remove-btn" onClick={handleClear}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <motion.div
                className="upload-placeholder"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload size={48} />
                <p>点击或拖拽图片到这里</p>
                <span>支持 JPG、PNG、GIF 格式</span>
              </motion.div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {imageName && (
            <p className="file-name">📎 {imageName}</p>
          )}

          <div className="mode-selector">
            <label>分析模式</label>
            <div className="mode-options">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.id}
                    className={`mode-btn ${mode === option.id ? 'active' : ''}`}
                    onClick={() => setMode(option.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon size={20} />
                    <span>{option.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="prompt-input">
            <label>分析提示（可选）</label>
            <textarea
              placeholder="输入你希望关注的分析要点..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <motion.button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!selectedImage || isAnalyzing}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isAnalyzing ? '分析中...' : '开始分析'}
          </motion.button>
        </div>

        <div className="result-section">
          {error && (
            <motion.div
              className="error-box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p>❌ {error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              className="result-box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="result-header">
                <h3>分析结果</h3>
                {result.confidence && (
                  <span className="confidence">
                    置信度: {(result.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="result-description">
                <h4>描述</h4>
                <p>{result.description}</p>
              </div>

              {result.generatedCode && (
                <div className="result-code">
                  <div className="code-header">
                    <h4>生成的代码</h4>
                    <motion.button
                      className="copy-code-btn"
                      onClick={handleCopyCode}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {copiedCode ? (
                        <>
                          <CheckCheck size={16} />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          复制代码
                        </>
                      )}
                    </motion.button>
                  </div>
                  <pre><code>{result.generatedCode}</code></pre>
                </div>
              )}

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="result-suggestions">
                  <h4>建议</h4>
                  <ul>
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {!result && !error && (
            <div className="empty-result">
              <p>上传图片并点击"开始分析"获取结果</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .image-analyzer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--color-bg-primary);
        }

        .analyzer-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-bg-secondary);
        }

        .analyzer-header h2 {
          font-size: 18px;
          font-weight: 600;
        }

        .analyzer-content {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          padding: 24px;
          overflow-y: auto;
        }

        .upload-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .upload-area {
          position: relative;
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          background-color: var(--color-bg-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-area:hover {
          border-color: var(--color-primary);
          background-color: rgba(59, 130, 246, 0.05);
        }

        .upload-area.has-image {
          border-style: solid;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--color-text-secondary);
        }

        .upload-placeholder p {
          font-size: 16px;
        }

        .upload-placeholder span {
          font-size: 14px;
          color: var(--color-text-muted);
        }

        .image-preview {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: var(--radius-lg);
        }

        .remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 8px;
          background-color: var(--color-error);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
        }

        .file-name {
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        .mode-selector label,
        .prompt-input label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--color-text-secondary);
        }

        .mode-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background-color: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mode-btn:hover {
          background-color: var(--color-bg-tertiary);
        }

        .mode-btn.active {
          background-color: rgba(59, 130, 246, 0.1);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .prompt-input textarea {
          width: 100%;
          padding: 12px;
          background-color: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-size: 14px;
          resize: vertical;
          outline: none;
        }

        .prompt-input textarea:focus {
          border-color: var(--color-primary);
        }

        .analyze-btn {
          padding: 14px 24px;
          background-color: var(--color-primary);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .analyze-btn:hover:not(:disabled) {
          background-color: var(--color-primary-dark);
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .result-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .error-box {
          padding: 16px;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-md);
          color: var(--color-error);
        }

        .result-box {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-header h3 {
          font-size: 16px;
          font-weight: 600;
        }

        .confidence {
          font-size: 14px;
          color: var(--color-success);
        }

        .result-description h4,
        .result-code h4,
        .result-suggestions h4 {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--color-text-secondary);
        }

        .result-description p {
          line-height: 1.6;
          color: var(--color-text-primary);
        }

        .result-code {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .copy-code-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background-color: var(--color-bg-tertiary);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 12px;
          cursor: pointer;
        }

        .result-code pre {
          padding: 16px;
          background-color: var(--color-bg-primary);
          border-radius: var(--radius-md);
          overflow-x: auto;
        }

        .result-code code {
          font-family: 'Fira Code', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.5;
        }

        .result-suggestions ul {
          list-style: none;
          padding: 0;
        }

        .result-suggestions li {
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }

        .result-suggestions li:last-child {
          border-bottom: none;
        }

        .empty-result {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
        `}</style>
    </div>
  );
};

export default ImageAnalyzer;
