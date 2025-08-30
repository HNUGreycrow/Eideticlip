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

// 类型定义（供 Vue 组件使用）
interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
  onStatusChange: (callback: (status: { maximized: boolean }) => void) => void
}

// 更新服务类型定义
interface UpdateControls {
  checkForUpdates: () => Promise<any>
  downloadUpdate: () => Promise<boolean | { error: any }>
  installUpdate: () => Promise<boolean>
  setAutoUpdate: (enabled: boolean) => Promise<boolean>
  getAutoUpdate: () => Promise<boolean>
  onUpdateStatus: (callback: (status: { status: string, data?: any }) => void) => () => void
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

// 配置 API
contextBridge.exposeInMainWorld('config', {
  // 通用配置方法
  get: (key: string) => ipcRenderer.invoke('config-get', key),
  set: (key: string, value: any) => ipcRenderer.invoke('config-set', key, value),
  getAll: () => ipcRenderer.invoke('config-get-all'),
  
  // 保留原有的特定方法以保持兼容性
  getTheme: () => ipcRenderer.invoke('config-get-theme'),
  setTheme: (theme: 'light' | 'dark') => ipcRenderer.invoke('config-set-theme', theme),
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
