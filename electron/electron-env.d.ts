/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  windowControls: {
    minimize: () => void
    maximize: () => void
    close: () => void
    onStatusChange: (callback: (status: { maximized: boolean }) => void) => void
  }
  clipboard: {
    read: () => Promise<string>
    write: (text: string) => Promise<void>
    startWatching: () => Promise<void>
    stopWatching: () => Promise<void>
    onChanged: (callback: (content: string) => void) => () => void
    saveItem: (item: any) => Promise<void>
    deleteItem: (id: number) => Promise<boolean>
    clearAll: () => Promise<boolean>
    getHistory: () => Promise<any[]>
  }
  config: {
    // 通用配置方法
    get: <T>(key: string) => Promise<T>
    set: <T>(key: string, value: T) => Promise<boolean>
    getAll: () => Promise<any>
    
    // 特定配置方法（保持兼容性）
    getTheme: () => Promise<'light' | 'dark'>
    setTheme: (theme: 'light' | 'dark') => Promise<boolean>
  }
}
