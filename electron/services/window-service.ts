import { BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { ConfigService } from "./config-service";

/**
 * 窗口管理服务类
 * 负责处理所有与窗口相关的操作，包括：
 * - 创建主窗口
 * - 处理窗口事件（最小化、最大化、关闭等）
 * - 管理窗口状态
 */
export class WindowService {
  private win: BrowserWindow | null = null;
  private readonly preloadPath: string;
  private readonly publicPath: string;
  private readonly rendererPath: string;
  private readonly devServerUrl: string | undefined;
  private configService: ConfigService;

  /**
   * 构造函数
   * @param preloadPath 预加载脚本路径
   * @param publicPath 公共资源目录路径
   * @param rendererPath 渲染进程构建产物目录路径
   * @param devServerUrl 开发服务器URL（开发环境）
   */
  constructor(
    preloadPath: string,
    publicPath: string,
    rendererPath: string,
    configService: ConfigService,
    devServerUrl?: string
  ) {
    this.preloadPath = preloadPath;
    this.publicPath = publicPath;
    this.rendererPath = rendererPath;
    this.devServerUrl = devServerUrl;
    this.configService = configService;
  }

  /**
   * 创建主窗口
   * @returns 创建的BrowserWindow实例
   */
  public createWindow(): BrowserWindow {
    // 创建窗口
    this.win = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      icon: path.join(this.publicPath, "20250815110628.png"), // 窗口图标路径
      show: false, // 先不显示窗口，等窗口准备好了才显示，防止渲染未完成时出现白框
      webPreferences: {
        preload: this.preloadPath, // 预加载脚本路径（用于安全地在渲染进程中暴露API）
      },
    });

    // 注册IPC事件处理程序
    this.registerIpcHandlers();

    // 窗口加载完成后，向渲染进程发送测试消息（主进程→渲染进程通信示例）
    this.win.webContents.on("did-finish-load", () => {
      this.win?.webContents.send(
        "main-process-message",
        new Date().toLocaleString()
      );
    });

    // 根据环境加载不同的页面：
    // 开发环境：加载Vite开发服务器（支持热更新）
    // 生产环境：加载本地构建好的index.html
    if (this.devServerUrl) {
      this.win.loadURL(this.devServerUrl);
    } else {
      this.win.loadFile(path.join(this.rendererPath, "index.html"));
    }

    // 窗口准备好后显示
    this.win.once("ready-to-show", () => {
      this.win?.show();
    });

    return this.win;
  }

  /**
   * 注册IPC事件处理程序
   */
  private registerIpcHandlers(): void {
    // 最小化窗口（实际是隐藏窗口）
    ipcMain.on("window-minimize", () => {
      const minimizeToTray = this.configService.get<boolean>("minimizeToTray");
      if (minimizeToTray) {
        this.win?.hide();
      } else {
        this.win?.minimize();
      }
    });

    // 最大化/还原窗口
    ipcMain.on("window-maximize", () => {
      if (this.win?.isMaximized()) {
        this.win.unmaximize();
      } else {
        this.win?.maximize();
      }
    });

    // 关闭窗口
    ipcMain.on("window-close", () => {
      this.win?.close();
    });
  }

  /**
   * 获取当前窗口实例
   * @returns 当前窗口实例或null
   */
  public getWindow(): BrowserWindow | null {
    return this.win;
  }

  /**
   * 显示窗口
   */
  public showWindow(): void {
    if (this.win) {
      this.win.show();
      this.win.focus();
    }
  }

  /**
   * 隐藏窗口
   */
  public hideWindow(): void {
    if (this.win) {
      this.win.hide();
    }
  }

  /**
   * 最小化窗口
   */
  public minimizeWindow(): void {
    if (this.win) {
      this.win.minimize();
    }
  }

  /**
   * 切换窗口显示状态
   */
  public toggleWindow(): void {
    if (this.win) {
      if (this.win.isVisible()) {
        this.win.hide();
      } else {
        this.win.show();
        this.win.focus();
      }
    }
  }

  /**
   * 清理资源
   * 在应用退出前调用，确保释放所有资源
   */
  public dispose(): void {
    this.win = null;
  }
}
