import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

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

app.whenReady().then(createWindow);

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

// IPC handlers
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);

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
        {
          silent: options.silent ?? false,
          deviceName: options.deviceName,
          printBackground: true,
        },
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
