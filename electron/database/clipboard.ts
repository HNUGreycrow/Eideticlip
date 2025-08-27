import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import fs from "node:fs";

// 在ES模块中模拟CommonJS的require功能（因为Electron有时需要使用CommonJS模块）
const require = createRequire(import.meta.url);
// 获取当前文件的目录路径（__dirname在ES模块中需手动定义）
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const Database = require("better-sqlite3");

// 数据库连接实例
let db: any = null;

/**
 * 初始化数据库
 * @param isDevelopment 是否为开发环境
 * @returns 数据库实例
 */
export function initDatabase(isDevelopment = false) {
  try {
    console.log("Initializing SQLite database");
    // 关键：根据是否开发模式决定数据库路径
    function getDbPath() {
      // 根据实际__dirname的值（dist-electron）调整路径
      return isDevelopment
        ? path.join(__dirname, "../database/clipboard.db") // 开发 -> 项目/database
        : path.join(process.resourcesPath, "database/clipboard.db"); // 生产 -> 安装目录/resources/database
    }

    // 确保数据库目录存在
    const dbFile = getDbPath();
    const dbDir = path.dirname(dbFile);
    // console.log(__dirname);
    // console.log("数据库目录:", dbDir);
    // console.log("数据库文件路径:", dbFile);

    if (!fs.existsSync(dbDir)) {
      console.log("创建数据库目录:", dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 创建或打开数据库
    console.log("尝试创建或打开数据库:", dbFile);
    try {
      db = new Database(dbFile);
      console.log("数据库创建/打开成功");
    } catch (dbError) {
      console.error("数据库创建/打开失败:", dbError);
      throw dbError;
    }

    const createCliboardItemQuery = `
      CREATE TABLE IF NOT EXISTS clipboard_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        size VARCHAR(10)
      );
    `;
    db.prepare(createCliboardItemQuery).run();

    return true;
  } catch (error) {
    console.error("Failed to initialize memory storage:", error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  try {
    // 关闭数据库连接
    if (db) {
      db.close();
      db = null;
      console.log("Database connection closed");
    }
  } catch (error) {
    console.error("Failed to close database connection:", error);
  }
}

/**
 * 保存剪贴板项目
 * @param item 剪贴板项目
 * @returns 是否保存成功
 */
export function saveClipboardItem(item: any) {
  try {
    // 将Date对象转换为ISO字符串
    const timestamp = item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp;
    
    const insertQuery = `
      INSERT INTO clipboard_items (content, type, timestamp, size)
      VALUES (?, ?, ?, ?)
    `
    db.prepare(insertQuery).run(item.content, item.type, timestamp, item.size);
    return true;
  } catch (error) {
    console.error("Failed to save clipboard item:", error);
    return false;
  }
}

/**
 * 删除剪贴板项目
 * @param id 项目ID
 * @returns 是否删除成功
 */
export function deleteClipboardItem(id: string) {
  try {
    const deleteQuery = `
      DELETE FROM clipboard_items WHERE id = ?
    `
    db.prepare(deleteQuery).run(id);
    return true;
  } catch (error) {
    console.error("Failed to delete clipboard item:", error);
    return false;
  }
}

/**
 * 清空剪贴板历史并重置ID
 * @returns 是否清空成功
 */
export function clearClipboardHistory() {
  try {
    db.transaction(() => {
      db.prepare(`DELETE FROM clipboard_items`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='clipboard_items'`).run();
    })();
    return true;
  } catch (err) {
    console.error('Failed to clear clipboard history:', err);
    return false;
  }
}

/**
 * 获取剪贴板历史
 * @returns 剪贴板历史列表
 */
export function getClipboardHistory() {
  try {
    const selectQuery = `
      SELECT * FROM clipboard_items order by id desc
    `
    const rows = db.prepare(selectQuery).all();
    return rows;
  } catch (error) {
    console.error("Failed to get clipboard history:", error);
    return [];
  }
}
