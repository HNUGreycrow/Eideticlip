/// <reference types="vite/client" />
interface WindowControls {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  onStatusChange: (callback: (status: { maximized: boolean }) => void) => void;
}

// 剪贴板项目类型定义
interface ClipboardItem {
  id: number;
  type: string;
  content: string;
  timestamp: Date;
  size: string;
}

interface clipboardAPI {
  read: () => Promise<string>;
  write: (text: string) => Promise<string | null>;
  // 剪贴板监听相关API
  startWatching: () => Promise<void>;
  stopWatching: () => Promise<void>;
  onChanged: (callback: (content: string) => void) => () => void;
  // 数据库操作API
  saveItem: (item: ClipboardItem) => Promise<void>;
  deleteItem: (id: number) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
  getHistory: () => Promise<ClipboardItem[]>;
}

// IPC渲染进程API类型定义
interface IpcRendererAPI {
  on: (channel: string, listener: (...args: any[]) => void) => void;
  off: (channel: string, ...args: any[]) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    windowControls: WindowControls;
    clipboard: clipboardAPI;
    ipcRenderer: IpcRendererAPI;
  }
}

export {};
