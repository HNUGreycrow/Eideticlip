import { clipboard, ipcMain, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import {
  saveClipboardItem,
  deleteClipboardItem,
  clearClipboardHistory,
  getClipboardHistory,
  setFavoriteStatus,
  getFavoriteClipboardItems,
} from "../database/clipboard";

// 在ES模块中模拟CommonJS的require功能
const require = createRequire(import.meta.url);
const clipboardEvent = require("clipboard-event");

/**
 * 剪贴板服务类
 * 负责处理所有与剪贴板相关的操作，包括：
 * - 读写剪贴板内容
 * - 监听剪贴板变化
 * - 管理剪贴板历史记录
 */
export class ClipboardService {
  private mainWindow: BrowserWindow | null = null;
  private lastClipboardContent: string = "";
  private isWatching: boolean = false;

  /**
   * 构造函数
   * @param mainWindow 主窗口实例，用于向渲染进程发送消息
   */
  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.lastClipboardContent = clipboard.readText();
    this.registerIpcHandlers();
  }

  /**
   * 注册所有IPC处理程序
   */
  private registerIpcHandlers(): void {
    // 读取剪贴板内容
    ipcMain.handle("clipboard-read", () => {
      return clipboard.readText();
    });

    // 写入剪贴板内容
    ipcMain.handle("clipboard-write", (_, text) => {
      clipboard.writeText(text);
      return true;
    });

    // 开始监听剪贴板变化
    ipcMain.handle("clipboard-watch-start", () => {
      return this.startWatching();
    });

    // 停止监听剪贴板变化
    ipcMain.handle("clipboard-watch-stop", () => {
      return this.stopWatching();
    });

    // 保存剪贴板历史（添加单个项目）
    ipcMain.handle("clipboard-save-item", (_, item) => {
      return saveClipboardItem(item);
    });

    // 删除剪贴板历史项目
    ipcMain.handle("clipboard-delete-item", (_, id) => {
      return deleteClipboardItem(id);
    });

    // 清空剪贴板历史
    ipcMain.handle("clipboard-clear-all", () => {
      return clearClipboardHistory();
    });

    // 获取剪贴板历史
    ipcMain.handle("clipboard-get-history", () => {
      return getClipboardHistory();
    });

    // 设置剪贴板项目的收藏状态
    ipcMain.handle("clipboard-set-favorite", (_, id, isFavorite) => {
      return setFavoriteStatus(id, isFavorite);
    });

    // 获取收藏的剪贴板项目
    ipcMain.handle("clipboard-get-favorites", () => {
      return getFavoriteClipboardItems();
    });
  }

  /**
   * 开始监听剪贴板变化
   * @returns 是否成功开始监听
   */
  public startWatching(): boolean {
    if (this.isWatching) {
      return true; // 已经在监听中
    }

    try {
      // 使用clipboard-event库监听剪贴板变化
      clipboardEvent.startListening();

      // 监听剪贴板变化事件
      clipboardEvent.on("change", () => {
        const currentContent = clipboard.readText();
        console.log(clipboard.availableFormats());
        // 如果内容变化了，通知渲染进程
        if (
          currentContent !== this.lastClipboardContent &&
          currentContent.trim() !== ""
        ) {
          this.lastClipboardContent = currentContent;
          this.mainWindow?.webContents.send(
            "clipboard-changed",
            currentContent
          );
        }
      });

      this.isWatching = true;
      return true;
    } catch (error) {
      console.error("启动剪贴板监听失败:", error);
      return false;
    }
  }

  /**
   * 停止监听剪贴板变化
   * @returns 是否成功停止监听
   */
  public stopWatching(): boolean {
    if (!this.isWatching) {
      return true; // 已经停止监听
    }

    try {
      // 停止监听剪贴板变化
      clipboardEvent.stopListening();
      this.isWatching = false;
      return true;
    } catch (error) {
      console.error("停止剪贴板监听失败:", error);
      return false;
    }
  }

  /**
   * 清理资源
   * 在应用退出前调用，确保释放所有资源
   */
  public dispose(): void {
    this.stopWatching();
    this.mainWindow = null;
  }
}
