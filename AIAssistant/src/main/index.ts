import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import { AIService } from './ai/ai-service';
import { FileSystemService } from './file/filesystem';

class AIAssistantApp {
  private mainWindow: BrowserWindow | null = null;
  private aiService: AIService;
  private fileService: FileSystemService;

  constructor() {
    this.aiService = new AIService();
    this.fileService = new FileSystemService();
  }

  async initialize() {
    await this.createWindow();
    this.setupMenu();
    this.setupIPC();
  }

  private async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#1E1E1E',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '打开文件',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const result = await dialog.showOpenDialog(this.mainWindow!, {
                properties: ['openFile'],
                filters: [
                  { name: '所有文件', extensions: ['*'] }
                ]
              });
              if (!result.canceled && result.filePaths.length > 0) {
                this.mainWindow?.webContents.send('file:opened', result.filePaths[0]);
              }
            }
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: 'CmdOrCtrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
          { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
          { type: 'separator' },
          { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
          { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => {
              dialog.showMessageBox(this.mainWindow!, {
                type: 'info',
                title: '关于 AIAssistant',
                message: 'AIAssistant v1.0.0',
                detail: '智能AI助手 - 基于DeepSeek和豆包'
              });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC() {
    ipcMain.handle('ai:chat', async (_event, message: string, context: any[]) => {
      return await this.aiService.chat(message, context);
    });

    ipcMain.handle('ai:analyze-file', async (_event, filePath: string, analysisType: string) => {
      return await this.aiService.analyzeFile(filePath, analysisType);
    });

    ipcMain.handle('file:read', async (_event, filePath: string) => {
      return await this.fileService.readFile(filePath);
    });

    ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
      return await this.fileService.writeFile(filePath, content);
    });

    ipcMain.handle('file:list', async (_event, dirPath: string) => {
      return await this.fileService.listDirectory(dirPath);
    });

    ipcMain.handle('dialog:open-file', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      return result;
    });
  }
}

const appInstance = new AIAssistantApp();

app.whenReady().then(async () => {
  await appInstance.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    appInstance.initialize();
  }
});
