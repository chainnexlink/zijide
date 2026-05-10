import { contextBridge, ipcRenderer } from 'electron';

export interface AIChatResult {
  response: string;
  error?: string;
}

export interface ImageAnalysisResult {
  description: string;
  generatedCode?: string;
  suggestions?: string[];
  confidence?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: number;
  extension?: string;
}

const electronAPI = {
  ai: {
    chat: (message: string, context: any[]): Promise<AIChatResult> => {
      return ipcRenderer.invoke('ai:chat', message, context);
    },
    analyzeImage: (imageBase64: string, prompt: string, mode: string): Promise<{ result?: ImageAnalysisResult; error?: string }> => {
      return ipcRenderer.invoke('ai:image-analysis', imageBase64, prompt, mode);
    }
  },
  file: {
    read: (filePath: string): Promise<{ content?: string; error?: string }> => {
      return ipcRenderer.invoke('file:read', filePath);
    },
    write: (filePath: string, content: string): Promise<{ success?: boolean; error?: string }> => {
      return ipcRenderer.invoke('file:write', filePath, content);
    },
    list: (dirPath: string): Promise<{ files?: FileInfo[]; error?: string }> => {
      return ipcRenderer.invoke('file:list', dirPath);
    }
  },
  dialog: {
    openFile: (): Promise<Electron.OpenDialogReturnValue> => {
      return ipcRenderer.invoke('dialog:open-file');
    },
    saveFile: (defaultPath: string): Promise<Electron.SaveDialogReturnValue> => {
      return ipcRenderer.invoke('dialog:save-file', defaultPath);
    }
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['menu:new-project', 'menu:open-project'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
  removeListener: (channel: string) => {
    const validChannels = ['menu:new-project', 'menu:open-project'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
