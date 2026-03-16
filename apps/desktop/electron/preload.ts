import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  printLabel: (options: { url: string; silent?: boolean; deviceName?: string }) =>
    ipcRenderer.invoke('print:label', options),
  getPrinters: () => ipcRenderer.invoke('print:getPrinters'),
});
