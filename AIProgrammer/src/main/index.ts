import { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';
import { DeepSeekService } from './ai/deepseek';
import { DoubaoVisionService } from './ai/doubao';
import { FileSystemService } from './file/filesystem';

class AIProgrammerApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private deepseekService: DeepSeekService;
  private doubaoService: DoubaoVisionService;
  private fileService: FileSystemService;

  constructor() {
    this.deepseekService = new DeepSeekService();
    this.doubaoService = new DoubaoVisionService();
    this.fileService = new FileSystemService();
  }

  async initialize() {
    await this.createWindow();
    this.setupMenu();
    this.setupIPC();
  }

  private async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      backgroundColor: '#1E293B',
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
            label: '新建项目',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow?.webContents.send('menu:new-project')
          },
          {
            label: '打开项目',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const result = await dialog.showOpenDialog(this.mainWindow!, {
                properties: ['openDirectory']
              });
              if (!result.canceled && result.filePaths.length > 0) {
                this.mainWindow?.webContents.send('menu:open-project', result.filePaths[0]);
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
          { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
          { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
          { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' }
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
                title: '关于 AIProgrammer',
                message: 'AIProgrammer v1.0.0',
                detail: '智能编程助手 - 基于DeepSeek和豆包'
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
      return await this.deepseekService.chat(message, context);
    });

    ipcMain.handle('ai:image-analysis', async (_event, imageBase64: string, prompt: string, mode: string) => {
      return await this.doubaoService.analyzeImage(imageBase64, prompt, mode);
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
          { name: '代码文件', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      return result;
    });

    ipcMain.handle('dialog:save-file', async (_event, defaultPath: string) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        defaultPath,
        filters: [
          { name: '代码文件', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      return result;
    });
  }
}

const myApp = new AIProgrammerApp();

app.whenReady().then(async () => {
  await myApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    myApp.initialize();
  }
});
