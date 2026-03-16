import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

const VIDEOS_DIR = path.join(app.getPath('userData'), 'videos');
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'PackagePro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureDir(VIDEOS_DIR);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// App info
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);

// Printing
ipcMain.handle('print:label', async (_event, options: { url: string; silent?: boolean; deviceName?: string }) => {
  if (!mainWindow) return { success: false, error: 'No window' };
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true },
    });
    await printWindow.loadURL(options.url);
    return new Promise((resolve) => {
      printWindow.webContents.print(
        { silent: options.silent ?? false, deviceName: options.deviceName, printBackground: true },
        (success, failureReason) => {
          printWindow.close();
          resolve({ success, error: failureReason });
        }
      );
    });
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('print:getPrinters', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// Video file operations
ipcMain.handle('video:saveChunk', async (_event, sessionId: string, chunk: ArrayBuffer) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId);
  await ensureDir(sessionDir);
  const chunkPath = path.join(sessionDir, `chunk_${Date.now()}.webm`);
  await fs.writeFile(chunkPath, Buffer.from(chunk));
  return { success: true, path: chunkPath };
});

ipcMain.handle('video:finalize', async (_event, sessionId: string) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId);
  try {
    const files = await fs.readdir(sessionDir);
    const chunks = files.filter(f => f.startsWith('chunk_')).sort();

    if (chunks.length === 0) {
      return { success: false, error: 'No chunks found' };
    }

    const outputPath = path.join(sessionDir, 'recording.webm');
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const data = await fs.readFile(path.join(sessionDir, chunk));
      buffers.push(data);
    }
    await fs.writeFile(outputPath, Buffer.concat(buffers));

    // Clean up individual chunks
    for (const chunk of chunks) {
      await fs.unlink(path.join(sessionDir, chunk)).catch(() => {});
    }

    return { success: true, path: outputPath, size: (await fs.stat(outputPath)).size };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('video:getPath', async (_event, sessionId: string) => {
  return path.join(VIDEOS_DIR, sessionId, 'recording.webm');
});

ipcMain.handle('video:delete', async (_event, sessionId: string) => {
  const sessionDir = path.join(VIDEOS_DIR, sessionId);
  try {
    await fs.rm(sessionDir, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Upload
ipcMain.handle('upload:file', async (_event, filePath: string, uploadUrl: string, token: string) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/webm',
        'x-upsert': 'true',
        ...(token ? { 'x-signature': token } : {}),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Upload failed: ${response.status} ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Config storage
ipcMain.handle('config:get', async (_event, key: string) => {
  try {
    const data = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
    return data[key] ?? null;
  } catch {
    return null;
  }
});

ipcMain.handle('config:set', async (_event, key: string, value: unknown) => {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
  } catch {
    // ignore
  }
  data[key] = value;
  await fs.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2));
  return { success: true };
});
