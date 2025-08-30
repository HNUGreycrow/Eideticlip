import { autoUpdater } from "electron-updater";
import { BrowserWindow, ipcMain } from "electron";
import { ConfigService } from "./config-service";

/**
 * 更新服务类
 * 负责整个应用的「自动更新」生命周期：
 *   1. 检查更新
 *   2. 下载更新
 *   3. 安装更新
 *   4. 将状态实时推送给渲染进程
 */
export class UpdateService {
  /** 主窗口实例，用来向渲染层发送消息 */
  private mainWindow: BrowserWindow;
  /** 配置服务，后续如需根据配置决定更新策略可扩展 */
  private configService: ConfigService;

  /**
   * 构造函数
   * @param mainWindow 已经创建好的主窗口
   * @param configService 配置服务实例
   */
  constructor(mainWindow: BrowserWindow, configService: ConfigService) {
    this.mainWindow = mainWindow;
    this.configService = configService;

    // 1. 注册所有 autoUpdater 事件监听
    this.configureAutoUpdater();

    // 2. 注册供渲染进程调用的 IPC 通道
    this.registerIpcHandlers();
  }

  /**
   * 配置 autoUpdater：
   *   - 关闭自动下载（让用户决定是否下载）
   *   - 监听所有更新相关事件，并把事件及数据转发给渲染进程
   */
  private configureAutoUpdater() {
    // 禁用自动下载；需要手动调用 downloadUpdate() 才会开始
    autoUpdater.autoDownload = false;

    // 开始检查更新
    autoUpdater.on("checking-for-update", () => {
      this.sendStatusToWindow("checking-for-update");
    });

    // 发现新版本
    autoUpdater.on("update-available", (info) => {
      this.sendStatusToWindow("update-available", info);
    });

    // 已是最新版本
    autoUpdater.on("update-not-available", (info) => {
      this.sendStatusToWindow("update-not-available", info);
    });

    // 更新出错
    autoUpdater.on("error", (err) => {
      this.sendStatusToWindow("error", err);
    });

    // 下载进度（每收到一块数据就触发一次）
    autoUpdater.on("download-progress", (progressObj) => {
      this.sendStatusToWindow("download-progress", progressObj);
    });

    // 更新包已下载完成，等待安装
    autoUpdater.on("update-downloaded", (info) => {
      this.sendStatusToWindow("update-downloaded", info);
    });
  }

  /**
   * 注册渲染进程可主动调用的 IPC 方法
   *   - check-for-updates   手动检查更新
   *   - download-update     开始下载
   *   - install-update      退出并安装
   */
  private registerIpcHandlers() {
    // 渲染层：ipcRenderer.invoke('check-for-updates')
    ipcMain.handle("check-for-updates", async () => {
      try {
        return await autoUpdater.checkForUpdates();
      } catch (error) {
        console.error("检查更新失败:", error);
        return { error };
      }
    });

    // 渲染层：ipcRenderer.invoke('download-update')
    ipcMain.handle("download-update", async () => {
      try {
        autoUpdater.downloadUpdate(); // 开始真正下载
        return true;
      } catch (error) {
        console.error("下载更新失败:", error);
        return { error };
      }
    });

    // 渲染层：ipcRenderer.invoke('install-update')
    ipcMain.handle("install-update", () => {
      // 第二个参数 true 表示重启后自动启动应用
      autoUpdater.quitAndInstall(false, true);
      return true;
    });
  }

  /**
   * 把 autoUpdater 事件统一转发给渲染进程
   * 渲染层监听：ipcRenderer.on('update-status', (e, { status, data }) => {...})
   */
  private sendStatusToWindow(status: string, data?: any) {
    this.mainWindow.webContents.send("update-status", { status, data });
  }

  /**
   * 暴露给外部：手动检查更新
   * 可在主窗口 ready-to-show 后调用，实现“启动时自动检查”
   */
  public checkForUpdates() {
    return autoUpdater.checkForUpdates();
  }

  /**
   * 释放资源：注销所有 IPC 通道
   * 建议在 app 退出前调用，防止重复注册
   */
  public dispose() {
    ipcMain.removeHandler("check-for-updates");
    ipcMain.removeHandler("download-update");
    ipcMain.removeHandler("install-update");
    // 下面两行是之前遗留的，保留以防旧代码调用
    ipcMain.removeHandler("set-auto-update");
    ipcMain.removeHandler("get-auto-update");
  }
}
