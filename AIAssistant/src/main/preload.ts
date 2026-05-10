import { contextBridge, ipcRenderer } from 'electron';

export interface AIChatResult {
  response: string;
  error?: string;
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
    analyzeFile: (filePath: string, analysisType: string): Promise<{ analysis: string; error?: string }> => {
      return ipcRenderer.invoke('ai:analyze-file', filePath, analysisType);
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
    }
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['file:opened'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
  removeListener: (channel: string) => {
    const validChannels = ['file:opened'];
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
