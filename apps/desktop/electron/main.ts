import { app, BrowserWindow, ipcMain, shell, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

const VIDEOS_DIR = path.join(app.getPath('userData'), 'videos');
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.enc.json');
const STATE_PATH = path.join(app.getPath('userData'), 'state.json');
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const ENCRYPTED_RECORDING_NAME = 'recording.enc';

type StoredState = {
  encrypted_data_key?: string;
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function isDevMode() {
  return process.env.NODE_ENV !== 'production';
}

function isAllowedUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      isDevMode() &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function assertAllowedUrl(rawUrl: string) {
  if (!isAllowedUrl(rawUrl)) {
    throw new Error('Disallowed URL');
  }
}

function resolveWithin(baseDir: string, targetPath: string) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new Error('Path escapes allowed directory');
  }
  return resolvedTarget;
}

function resolveSessionDir(sessionId: string) {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error('Invalid session identifier');
  }

  return resolveWithin(VIDEOS_DIR, path.join(VIDEOS_DIR, sessionId));
}

function resolveSessionFile(sessionId: string, filename: string) {
  const sessionDir = resolveSessionDir(sessionId);
  return resolveWithin(sessionDir, path.join(sessionDir, filename));
}

async function readState(): Promise<StoredState> {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf-8')) as StoredState;
  } catch {
    return {};
  }
}

async function writeState(state: StoredState) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

async function getDataKey() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-backed encryption is unavailable');
  }

  const state = await readState();
  if (state.encrypted_data_key) {
    const decryptedHex = safeStorage.decryptString(
      Buffer.from(state.encrypted_data_key, 'base64')
    );
    return Buffer.from(decryptedHex, 'hex');
  }

  const key = randomBytes(32);
  state.encrypted_data_key = safeStorage
    .encryptString(key.toString('hex'))
    .toString('base64');
  await writeState(state);
  return key;
}

async function encryptBuffer(plaintext: Buffer) {
  const key = await getDataKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

async function decryptBuffer(encryptedPayload: Buffer) {
  const key = await getDataKey();
  const iv = encryptedPayload.subarray(0, 12);
  const tag = encryptedPayload.subarray(12, 28);
  const ciphertext = encryptedPayload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function writeEncryptedFile(targetPath: string, plaintext: Buffer) {
  const encrypted = await encryptBuffer(plaintext);
  await fs.writeFile(targetPath, encrypted);
}

async function readEncryptedFile(targetPath: string) {
  return decryptBuffer(await fs.readFile(targetPath));
}

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { payload?: string } & Record<string, unknown>;
    if (typeof parsed.payload === 'string') {
      const decrypted = await decryptBuffer(Buffer.from(parsed.payload, 'base64'));
      return JSON.parse(decrypted.toString('utf-8')) as Record<string, unknown>;
    }

    // Migrate legacy plaintext config transparently.
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeConfig(data: Record<string, unknown>) {
  const plaintext = Buffer.from(JSON.stringify(data), 'utf-8');
  const encrypted = await encryptBuffer(plaintext);
  await fs.writeFile(
    CONFIG_PATH,
    JSON.stringify({ version: 2, payload: encrypted.toString('base64') }, null, 2),
    'utf-8'
  );
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
    if (isAllowedUrl(url)) {
      void shell.openExternal(url);
    }
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
ipcMain.handle(
  'print:label',
  async (_event, options: { url: string; silent?: boolean; deviceName?: string }) => {
    if (!mainWindow) return { success: false, error: 'No window' };
    try {
      assertAllowedUrl(options.url);
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
  }
);

ipcMain.handle('print:getPrinters', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// Video file operations
ipcMain.handle('video:saveChunk', async (_event, sessionId: string, chunk: ArrayBuffer) => {
  try {
    const sessionDir = resolveSessionDir(sessionId);
    await ensureDir(sessionDir);
    const chunkPath = resolveSessionFile(sessionId, `chunk_${Date.now()}.bin`);
    await writeEncryptedFile(chunkPath, Buffer.from(chunk));
    return { success: true, path: chunkPath };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('video:finalize', async (_event, sessionId: string) => {
  try {
    const sessionDir = resolveSessionDir(sessionId);
    const files = await fs.readdir(sessionDir);
    const chunks = files.filter((file) => file.startsWith('chunk_') && file.endsWith('.bin')).sort();

    if (chunks.length === 0) {
      return { success: false, error: 'No chunks found' };
    }

    const outputPath = resolveSessionFile(sessionId, ENCRYPTED_RECORDING_NAME);
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const data = await readEncryptedFile(resolveSessionFile(sessionId, chunk));
      buffers.push(data);
    }

    const mergedRecording = Buffer.concat(buffers);
    await writeEncryptedFile(outputPath, mergedRecording);

    for (const chunk of chunks) {
      await fs.unlink(resolveSessionFile(sessionId, chunk)).catch(() => {});
    }

    return {
      success: true,
      path: outputPath,
      size: mergedRecording.byteLength,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('video:getPath', async (_event, sessionId: string) => {
  return resolveSessionFile(sessionId, ENCRYPTED_RECORDING_NAME);
});

ipcMain.handle('video:delete', async (_event, sessionId: string) => {
  try {
    const sessionDir = resolveSessionDir(sessionId);
    await fs.rm(sessionDir, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Upload
ipcMain.handle(
  'upload:file',
  async (_event, filePath: string, uploadUrl: string, token: string) => {
    try {
      const resolvedFilePath = resolveWithin(VIDEOS_DIR, filePath);
      assertAllowedUrl(uploadUrl);
      const fileBuffer = await readEncryptedFile(resolvedFilePath);
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
  }
);

// Config storage
ipcMain.handle('config:get', async (_event, key: string) => {
  try {
    const data = await readConfig();
    return data[key] ?? null;
  } catch {
    return null;
  }
});

ipcMain.handle('config:set', async (_event, key: string, value: unknown) => {
  const data = await readConfig();
  data[key] = value;
  await writeConfig(data);
  return { success: true };
});
