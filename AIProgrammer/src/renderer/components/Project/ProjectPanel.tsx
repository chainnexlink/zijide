import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, File, ChevronRight, ChevronDown, Plus, RefreshCw } from 'lucide-react';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: number;
  extension?: string;
}

const ProjectPanel: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    setError(null);
    
    const result = await window.electronAPI.file.list(dirPath);
    
    if (result.error) {
      setError(result.error);
    } else if (result.files) {
      setFiles(result.files);
    }
    
    setLoading(false);
  };

  const handleOpenFolder = async () => {
    const result = await window.electronAPI.dialog.openFile();
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const dirPath = filePath.substring(0, filePath.lastIndexOf('\\'));
      setCurrentPath(dirPath);
      await loadDirectory(dirPath);
    }
  };

  const handleRefresh = () => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  };

  const toggleDirectory = async (dir: FileInfo) => {
    const newExpanded = new Set(expandedDirs);
    
    if (expandedDirs.has(dir.path)) {
      newExpanded.delete(dir.path);
    } else {
      newExpanded.add(dir.path);
      await loadDirectory(dir.path);
    }
    
    setExpandedDirs(newExpanded);
  };

  const getFileIcon = (file: FileInfo) => {
    if (file.isDirectory) {
      return <FolderOpen size={18} className="folder-icon" />;
    }
    
    const iconColors: Record<string, string> = {
      ts: '#3178c6',
      tsx: '#3178c6',
      js: '#f7df1e',
      jsx: '#f7df1e',
      py: '#3776ab',
      java: '#007396',
      html: '#e34c26',
      css: '#264de4',
      json: '#cbcb41',
      md: '#083fa1',
    };
    
    return (
      <File 
        size={18} 
        style={{ color: iconColors[file.extension || ''] || '#94a3b8' }} 
      />
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="project-panel">
      <div className="project-header">
        <h2>项目管理</h2>
        <div className="header-actions">
          <motion.button
            className="action-btn"
            onClick={handleOpenFolder}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FolderOpen size={18} />
            <span>打开文件夹</span>
          </motion.button>
          <motion.button
            className="action-btn"
            onClick={handleRefresh}
            disabled={!currentPath || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </motion.button>
        </div>
      </div>

      <div className="project-path">
        {currentPath ? (
          <span className="current-path">{currentPath}</span>
        ) : (
          <span className="no-project">未打开项目</span>
        )}
      </div>

      <div className="file-tree">
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {!currentPath && (
          <div className="empty-state">
            <FolderOpen size={64} />
            <p>点击"打开文件夹"开始</p>
          </div>
        )}

        {currentPath && files.length === 0 && !loading && (
          <div className="empty-state">
            <p>文件夹为空</p>
          </div>
        )}

        {files.map((file) => (
          <motion.div
            key={file.path}
            className="file-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div
              className="file-row"
              onClick={() => file.isDirectory && toggleDirectory(file)}
              style={{ paddingLeft: 0 }}
            >
              {file.isDirectory && (
                <span className="expand-icon">
                  {expandedDirs.has(file.path) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </span>
              )}
              {getFileIcon(file)}
              <span className="file-name">{file.name}</span>
              {!file.isDirectory && (
                <span className="file-size">{formatFileSize(file.size)}</span>
              )}
              <span className="file-date">{formatDate(file.modifiedTime)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <style>{`
        .project-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--color-bg-primary);
        }

        .project-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--color-border);
          background-color: var(--color-bg-secondary);
        }

        .project-header h2 {
          font-size: 18px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: var(--color-bg-tertiary);
          border: none;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-btn:hover:not(:disabled) {
          background-color: var(--color-primary);
          color: white;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .project-path {
          padding: 12px 24px;
          background-color: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
        }

        .current-path {
          font-size: 13px;
          color: var(--color-text-secondary);
          font-family: 'Fira Code', monospace;
        }

        .no-project {
          font-size: 13px;
          color: var(--color-text-muted);
        }

        .file-tree {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .error-message {
          padding: 16px;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-md);
          color: var(--color-error);
          margin-bottom: 16px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: var(--color-text-muted);
          gap: 16px;
        }

        .file-item {
          margin-bottom: 2px;
        }

        .file-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .file-row:hover {
          background-color: var(--color-bg-secondary);
        }

        .expand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          color: var(--color-text-muted);
        }

        .folder-icon {
          color: var(--color-warning);
        }

        .file-name {
          flex: 1;
          font-size: 14px;
          color: var(--color-text-primary);
        }

        .file-size {
          font-size: 12px;
          color: var(--color-text-muted);
          min-width: 60px;
          text-align: right;
        }

        .file-date {
          font-size: 12px;
          color: var(--color-text-muted);
          min-width: 140px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default ProjectPanel;
