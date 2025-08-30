export interface WindowControls {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  onStatusChange: (callback: (status: { maximized: boolean }) => void) => void;
}

// 剪贴板项目类型定义
export interface ClipboardItem {
  id: number;
  type: string;
  content: string;
  timestamp: Date;
  size: string;
  is_favorite?: boolean;
}

export interface clipboardAPI {
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
  // 收藏相关API
  setFavorite: (id: number, isFavorite: boolean) => Promise<boolean>;
  getFavorites: () => Promise<ClipboardItem[]>;
}

export interface IpcRendererAPI {
  on: (channel: string, listener: (...args: any[]) => void) => void;
  off: (channel: string, ...args: any[]) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  once: (channel: string, listener: (...args: any[]) => void) => void;
}

// 更新服务类型定义
export interface UpdateControls {
  checkForUpdates: () => Promise<any>
  downloadUpdate: () => Promise<boolean | { error: any }>
  installUpdate: () => Promise<boolean>
  setAutoUpdate: (enabled: boolean) => Promise<boolean>
  getAutoUpdate: () => Promise<boolean>
  onUpdateStatus: (callback: (status: { status: string, data?: any }) => void) => () => void
}