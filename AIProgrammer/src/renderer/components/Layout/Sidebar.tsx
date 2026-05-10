import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Image, FolderOpen, Settings } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'chat' | 'image' | 'project' | 'settings') => void;
}

const menuItems = [
  { id: 'chat', icon: MessageSquare, label: 'AI对话' },
  { id: 'image', icon: Image, label: '图片识别' },
  { id: 'project', icon: FolderOpen, label: '项目管理' },
  { id: 'settings', icon: Settings, label: '设置' }
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <motion.div
          className="logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="logo-icon">🤖</span>
          <span className="logo-text">AI</span>
        </motion.div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <motion.button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onViewChange(item.id as any)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon size={24} />
              <span className="nav-label">{item.label}</span>
              {isActive && (
                <motion.div
                  className="active-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <style>{`
        .sidebar {
          width: 200px;
          background-color: var(--color-bg-secondary);
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--color-border);
        }

        .sidebar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid var(--color-border);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .logo-icon {
          font-size: 32px;
        }

        .logo-text {
          font-size: 24px;
          font-weight: bold;
          background: linear-gradient(135deg, var(--color-primary), var(--color-success));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: color var(--transition-fast);
          overflow: hidden;
        }

        .nav-item:hover {
          color: var(--color-text-primary);
          background-color: var(--color-bg-tertiary);
        }

        .nav-item.active {
          color: var(--color-primary);
          background-color: rgba(59, 130, 246, 0.1);
        }

        .nav-label {
          font-size: 14px;
          font-weight: 500;
        }

        .active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background-color: var(--color-primary);
          border-radius: 0 2px 2px 0;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
