export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  printLabel: (options: { url: string; silent?: boolean; deviceName?: string }) => Promise<{ success: boolean; error?: string }>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
  saveVideoChunk: (sessionId: string, chunk: ArrayBuffer) => Promise<{ success: boolean; path?: string }>;
  finalizeVideo: (sessionId: string) => Promise<{ success: boolean; path?: string; size?: number; error?: string }>;
  getVideoPath: (sessionId: string) => Promise<string>;
  deleteVideo: (sessionId: string) => Promise<{ success: boolean }>;
  uploadFile: (filePath: string, uploadUrl: string, token: string) => Promise<{ success: boolean; error?: string }>;
  getConfig: (key: string) => Promise<unknown>;
  setConfig: (key: string, value: unknown) => Promise<{ success: boolean }>;
  setConfigMany: (values: Record<string, unknown>) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
