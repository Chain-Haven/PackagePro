export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  printLabel: (options: { url: string; silent?: boolean; deviceName?: string }) => Promise<{ success: boolean; error?: string }>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
