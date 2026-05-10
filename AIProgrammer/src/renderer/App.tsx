import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import ChatPanel from './components/Chat/ChatPanel';
import ImageAnalyzer from './components/ImageAnalyzer/ImageAnalyzer';
import ProjectPanel from './components/Project/ProjectPanel';
import Settings from './components/Settings/Settings';
import StatusBar from './components/Layout/StatusBar';

type ViewType = 'chat' | 'image' | 'project' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [apiStatus, setApiStatus] = useState<{
    deepseek: boolean;
    doubao: boolean;
  }>({
    deepseek: false,
    doubao: false
  });

  const renderMainContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatPanel />;
      case 'image':
        return <ImageAnalyzer />;
      case 'project':
        return <ProjectPanel />;
      case 'settings':
        return <Settings onApiStatusChange={setApiStatus} />;
      default:
        return <ChatPanel />;
    }
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="content-wrapper"
            >
              {renderMainContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <StatusBar apiStatus={apiStatus} />
    </div>
  );
};

export default App;
