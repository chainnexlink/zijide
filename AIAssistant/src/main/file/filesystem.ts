import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: number;
  extension?: string;
}

export class FileSystemService {
  async readFile(filePath: string): Promise<{ content?: string; error?: string }> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { content };
    } catch (error: any) {
      return { error: `文件读取失败: ${error.message}` };
    }
  }

  async writeFile(filePath: string, content: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return { error: `文件写入失败: ${error.message}` };
    }
  }

  async listDirectory(dirPath: string): Promise<{ files?: FileInfo[]; error?: string }> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.promises.stat(fullPath);
        
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modifiedTime: stats.mtimeMs,
          extension: entry.isDirectory() ? undefined : path.extname(entry.name).slice(1)
        });
      }

      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return { files };
    } catch (error: any) {
      return { error: `目录读取失败: ${error.message}` };
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
