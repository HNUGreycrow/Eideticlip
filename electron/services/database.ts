import { app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// 使用内存存储替代数据库
let clipboardItems: any[] = [];

// 在ES模块中模拟CommonJS的require功能（因为Electron有时需要使用CommonJS模块）
const require = createRequire(import.meta.url);
// 获取当前文件的目录路径（__dirname在ES模块中需手动定义）
const __dirname = path.dirname(fileURLToPath(import.meta.url));


/**
 * 初始化数据库（内存存储版本）
 * @param isDevelopment 是否为开发环境
 * @returns 内存存储实例
 */
export function initDatabase(isDevelopment = false) {
  try {
    console.log('Initializing memory storage');
    // 重置剪贴板项目数组
    clipboardItems = [];
    return true;
  } catch (error) {
    console.error('Failed to initialize memory storage:', error);
    throw error;
  }
}

/**
 * 关闭数据库连接（内存存储版本）
 */
export function closeDatabase() {
  try {
    // 清空内存数据
    clipboardItems = [];
    console.log('Memory storage cleared');
  } catch (error) {
    console.error('Failed to clear memory storage:', error);
  }
}

/**
 * 保存剪贴板项目（内存存储版本）
 * @param item 剪贴板项目
 * @returns 是否保存成功
 */
export function saveClipboardItem(item: any) {
  try {
    // 添加到内存数组
    clipboardItems.unshift(item);
    return true;
  } catch (error) {
    console.error('Failed to save clipboard item:', error);
    return false;
  }
}

/**
 * 删除剪贴板项目（内存存储版本）
 * @param id 项目ID
 * @returns 是否删除成功
 */
export function deleteClipboardItem(id: string) {
  try {
    // 从内存数组中过滤掉要删除的项目
    clipboardItems = clipboardItems.filter(item => item.id !== id);
    return true;
  } catch (error) {
    console.error('Failed to delete clipboard item:', error);
    return false;
  }
}

/**
 * 清空剪贴板历史（内存存储版本）
 * @returns 是否清空成功
 */
export function clearClipboardHistory() {
  try {
    // 清空内存数组
    clipboardItems = [];
    return true;
  } catch (error) {
    console.error('Failed to clear clipboard history:', error);
    return false;
  }
}

/**
 * 获取剪贴板历史（内存存储版本）
 * @returns 剪贴板历史列表
 */
export function getClipboardHistory() {
  try {
    // 直接返回内存数组
    return clipboardItems;
  } catch (error) {
    console.error('Failed to get clipboard history:', error);
    return [];
  }
}