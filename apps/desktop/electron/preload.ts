import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Printing
  printLabel: (options: { url: string; silent?: boolean; deviceName?: string }) =>
    ipcRenderer.invoke('print:label', options),
  getPrinters: () => ipcRenderer.invoke('print:getPrinters'),

  // Video file operations
  saveVideoChunk: (sessionId: string, chunk: ArrayBuffer) =>
    ipcRenderer.invoke('video:saveChunk', sessionId, chunk),
  finalizeVideo: (sessionId: string) => ipcRenderer.invoke('video:finalize', sessionId),
  getVideoPath: (sessionId: string) => ipcRenderer.invoke('video:getPath', sessionId),
  deleteVideo: (sessionId: string) => ipcRenderer.invoke('video:delete', sessionId),

  // Upload
  uploadFile: (filePath: string, uploadUrl: string, token: string) =>
    ipcRenderer.invoke('upload:file', filePath, uploadUrl, token),

  // Config storage
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  setConfigMany: (values: Record<string, unknown>) => ipcRenderer.invoke('config:setMany', values),
});
