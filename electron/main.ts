import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
} from "electron"; // 导入Electron核心模块：app(应用控制)、BrowserWindow(窗口管理)、Tray(系统托盘)、globalShortcut(全局快捷键)
import { createRequire } from "node:module"; // 导入Node模块：用于在ES模块中创建require函数
import { fileURLToPath } from "node:url"; // 导入Node模块：将URL转换为文件路径
import path from "node:path"; // 导入Node模块：处理文件路径
// 导入数据库服务
import {
  initDatabase,
  closeDatabase,
  saveClipboardItem,
  deleteClipboardItem,
  clearClipboardHistory,
  getClipboardHistory,
} from "./database/clipboard";

// 在ES模块中模拟CommonJS的require功能（因为Electron有时需要使用CommonJS模块）
const require = createRequire(import.meta.url);
const clipboardEvent = require('clipboard-event');
// 获取当前文件的目录路径（__dirname在ES模块中需手动定义）
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 目录结构说明（项目构建后）：
// ├─┬─┬ dist                  # 渲染进程构建产物
// │ │ └── index.html          # 主页面
// │ │
// │ ├─┬ dist-electron         # 主进程构建产物
// │ │ ├── main.js             # 主进程入口
// │ │ └── preload.mjs         # 预加载脚本
// │

// 设置应用根目录环境变量（指向项目根目录，方便后续路径计算）
process.env.APP_ROOT = path.join(__dirname, "..");

// 开发环境下Vite服务器的URL（从环境变量获取，用于开发时热更新）
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
// 主进程构建产物目录（dist-electron）
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
// 渲染进程构建产物目录（dist）
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

// 公共资源目录：开发环境用public文件夹，生产环境用渲染进程构建目录
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// 声明主窗口变量（全局变量避免被垃圾回收）
let win: BrowserWindow | null;

// 声明托盘变量（全局变量避免被垃圾回收）
let tray: Tray | null = null;

/**
 * 创建应用主窗口
 */
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"), // 窗口图标路径
    show: false, //先不显示窗口，等窗口准备好了才显示，防止渲染未完成时出现白框
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"), // 预加载脚本路径（用于安全地在渲染进程中暴露API）
    },
  });

  // 窗口加载完成后，向渲染进程发送测试消息（主进程→渲染进程通信示例）
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // 根据环境加载不同的页面：
  // 开发环境：加载Vite开发服务器（支持热更新）
  // 生产环境：加载本地构建好的index.html
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  ipcMain.on("window-minimize", () => {
    // 最小化时隐藏窗口而不是真正最小化
    win?.hide();
  });

  ipcMain.on("window-maximize", () => {
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on("window-close", () => {
    win?.close();
  });

  win.once("ready-to-show", () => {
    win?.show();
  });

  // 创建系统托盘
  createTray();

  // 剪贴板读写操作
  ipcMain.handle("clipboard-read", () => {
    return clipboard.readText();
  });

  ipcMain.handle("clipboard-write", (_, text) => {
    clipboard.writeText(text);
    return true;
  });

  // 剪贴板监听相关变量
  let lastClipboardContent = clipboard.readText();
  
  // 开始监听剪贴板变化
  ipcMain.handle("clipboard-watch-start", () => {
    // 使用clipboard-event库监听剪贴板变化
    clipboardEvent.startListening();
    
    // 监听剪贴板变化事件
    clipboardEvent.on("change", () => {
      const currentContent = clipboard.readText();
      // 如果内容变化了，通知渲染进程
      if (
        currentContent !== lastClipboardContent &&
        currentContent.trim() !== ""
      ) {
        lastClipboardContent = currentContent;
        win?.webContents.send("clipboard-changed", currentContent);
      }
    });
    
    return true;
  });

  // 停止监听剪贴板变化
  ipcMain.handle("clipboard-watch-stop", () => {
    // 停止监听剪贴板变化
    clipboardEvent.stopListening();
    return true;
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
}

// 监听所有窗口关闭事件：
// 在非macOS系统（如Windows、Linux），所有窗口关闭后退出应用
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // darwin是macOS的标识
    app.quit();
    win = null; // 释放窗口引用
  }
});

// 监听应用激活事件（主要针对macOS）：
// 当点击 dock 图标且没有其他窗口打开时，重新创建窗口
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * 创建系统托盘
 */
function createTray() {
  // 创建托盘图标
  const icon = nativeImage.createFromPath(
    path.join(process.env.VITE_PUBLIC, "20250815110628.png")
  );

  tray = new Tray(icon);
  tray.setToolTip("Electron Clipboard Hub");

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示",
      click: () => {
        if (win) {
          win.show();
        }
      },
    },
    {
      label: "隐藏",
      click: () => {
        if (win) {
          win.hide();
        }
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.quit();
      },
    },
  ]);

  // 设置托盘菜单
  tray.setContextMenu(contextMenu);

  // 点击托盘图标时显示/隐藏窗口
  tray.on("click", () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
      }
    }
  });
}

/**
 * 注册全局快捷键
 * @param shortcut 要注册的快捷键
 * @returns 包含注册结果和错误信息的对象
 */
function registerGlobalShortcuts(shortcut: string) {
  // 检查快捷键格式是否有效
  if (!shortcut || shortcut.trim() === "") {
    return { success: false, error: "快捷键格式无效" };
  }

  try {
    // 检查快捷键是否已被注册（被其他应用占用）
    if (globalShortcut.isRegistered(shortcut)) {
      return { success: false, error: "快捷键已被其他应用占用" };
    }
    const shortcutRegistered = globalShortcut.register(shortcut, () => {
      if (win) {
        if(!win.isFocused() || !win.isVisible()) {
          win.show();
          win.focus(); // 确保窗口获得焦点
        }
        else {
          win.hide();
        }
      } else {
        createWindow();
      }
    });

    if (!shortcutRegistered) {
      console.error("快捷键注册失败");
      return { success: false, error: "快捷键注册失败" };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("注册快捷键时发生错误:", error);
    return { success: false, error: "注册快捷键时发生错误" };
  }
}

// 应用就绪后初始化数据库并创建主窗口（Electron应用启动的入口点）
app.whenReady().then(() => {
  // 初始化数据库，判断是否为开发环境
  const isDevelopment = !!VITE_DEV_SERVER_URL;
  try {
    initDatabase(isDevelopment);
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }

  // 创建主窗口
  createWindow();

  // 注册全局快捷键
  // 注册 Ctrl+Alt+C 快捷键来显示/隐藏应用窗口
  registerGlobalShortcuts("CommandOrControl+Alt+C");

  // 修改启动快捷键
  ipcMain.on("update-shortcut", (_event, { oldShortcut, newShortcut }) => {
    // 先注销旧快捷键
    if (oldShortcut) {
      globalShortcut.unregister(oldShortcut);
    }

    // 注册新快捷键
    if (newShortcut) {
      const result = registerGlobalShortcuts(newShortcut);

      // 如果注册失败，发送错误消息回渲染进程
      if (!result.success) {
        console.log("快捷键注册失败，发送错误消息:", result.error);
        win?.webContents.send("shortcut-update-result", {
          success: false,
          error: result.error,
          shortcut: oldShortcut,
        });
        // 尝试重新注册旧快捷键
        if (oldShortcut) {
          registerGlobalShortcuts(oldShortcut);
        }
      } else {
        // 注册成功，发送成功消息
        console.log("快捷键注册成功，发送成功消息");
        win?.webContents.send("shortcut-update-result", {
          success: true,
          shortcut: newShortcut,
        });
      }
    }
  });
});

// 应用退出前关闭数据库连接
app.on("will-quit", () => {
  closeDatabase();

  // 销毁托盘
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // 停止监听剪贴板
  clipboardEvent.stopListening();
  
  // 注销所有快捷键
  globalShortcut.unregisterAll();
});
