/// <reference types="vite/client" />
import { WindowControls, clipboardAPI, IpcRendererAPI } from "./utils/type";

declare global {
  interface Window {
    windowControls: WindowControls;
    clipboard: clipboardAPI;
    ipcRenderer: IpcRendererAPI;
  }
}

export {};
