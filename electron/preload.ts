import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// 类型定义（供 Vue 组件使用）
interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
  onStatusChange: (callback: (status: { maximized: boolean }) => void) => void
}
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
} as WindowControls)

// 剪切板 API
contextBridge.exposeInMainWorld('clipboard', {
  read: () => ipcRenderer.invoke('clipboard-read'),
  write: (text: string) => ipcRenderer.invoke('clipboard-write', text),
  // 新增剪贴板监听相关API
  startWatching: () => ipcRenderer.invoke('clipboard-watch-start'),
  stopWatching: () => ipcRenderer.invoke('clipboard-watch-stop'),
  onChanged: (callback: (content: string) => void) => {
    const wrappedCallback = (_: any, content: string) => callback(content);
    ipcRenderer.on('clipboard-changed', wrappedCallback);
    return () => ipcRenderer.removeListener('clipboard-changed', wrappedCallback);
  },
  // 剪贴板历史记录相关API
  saveItem: (item: any) => ipcRenderer.invoke('clipboard-save-item', item),
  deleteItem: (id: number) => ipcRenderer.invoke('clipboard-delete-item', id),
  clearAll: () => ipcRenderer.invoke('clipboard-clear-all'),
  getHistory: () => ipcRenderer.invoke('clipboard-get-history')
})