import { WindowControls, UpdateControls } from '@/utils/type'
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
  once(...args: Parameters<typeof ipcRenderer.once>) {
    const [channel, listener] = args;
    return ipcRenderer.once(channel, listener);
  }

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const wrappedCallback = (_: any, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window-maximize-changed', wrappedCallback);
    return () => ipcRenderer.removeListener('window-maximize-changed', wrappedCallback);
  }
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
  deleteBatch: (ids: number[]) => ipcRenderer.invoke('clipboard-delete-batch', ids),
  clearAll: () => ipcRenderer.invoke('clipboard-clear-all'),
  getHistory: (page: number, pageSize: number, type: string) => ipcRenderer.invoke('clipboard-get-history', page, pageSize, type),
  // 收藏相关API
  setFavorite: (id: number, isFavorite: boolean) => ipcRenderer.invoke('clipboard-set-favorite', id, isFavorite),
  getFavorites: () => ipcRenderer.invoke('clipboard-get-favorites')
})

// 配置 API
contextBridge.exposeInMainWorld('config', {
  // 通用配置方法
  get: (key: string) => ipcRenderer.invoke('config-get', key),
  set: (key: string, value: any) => ipcRenderer.invoke('config-set', key, value),
  getAll: () => ipcRenderer.invoke('config-get-all'),
   // 快捷键相关已通过现有的update-shortcut和shortcut-update-result处理
})

// 暴露更新相关API
contextBridge.exposeInMainWorld('updater', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  setAutoUpdate: (enabled: boolean) => ipcRenderer.invoke('set-auto-update', enabled),
  getAutoUpdate: () => ipcRenderer.invoke('get-auto-update'),
  onUpdateStatus: (callback: (status: { status: string, data?: any }) => void) => {
    // 创建一个包装函数来处理事件参数
    const wrappedCallback = (_event: any, status: any) => callback(status);
    ipcRenderer.on('update-status', wrappedCallback);
    // 返回一个清理函数，使用相同的包装函数移除监听器
    return () => ipcRenderer.removeListener('update-status', wrappedCallback);
  }
} as UpdateControls)
