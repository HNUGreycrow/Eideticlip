import path from "node:path";
import { createRequire } from "node:module";
import fs from "node:fs";
import { app } from "electron";

// 在ES模块中模拟CommonJS的require功能（因为Electron有时需要使用CommonJS模块）
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

// 数据库连接实例
let db: any = null;

/**
 * 初始化数据库
 * @param _isDevelopment 是否为开发环境
 * @returns 数据库实例
 */
export function initDatabase(_isDevelopment = false) {
  try {
    console.log("Initializing SQLite database");

    function getDbPath() {
      return path.join(app.getPath("userData"), "database/clipboard.db"); // 生产 -> %APPDATA%/<your-app-name>/database/clipboard.db
    }

    // 确保数据库目录存在
    const dbFile = getDbPath();
    const dbDir = path.dirname(dbFile);
    if (!fs.existsSync(dbDir)) {
      console.log("创建数据库目录:", dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 创建或打开数据库
    console.log("尝试创建或打开数据库:", dbFile);
    try {
      db = new Database(dbFile);
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
        size VARCHAR(10),
        is_favorite BOOLEAN DEFAULT 0
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
 * @returns 保存后的项目ID，失败时返回null
 */
export function saveClipboardItem(item: any) {
  try {
    // 将Date对象转换为ISO字符串
    const timestamp = item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp;
    const isFavorite = item.is_favorite ? 1 : 0;
    
    const insertQuery = `
      INSERT INTO clipboard_items (content, type, timestamp, size, is_favorite)
      VALUES (?, ?, ?, ?, ?)
    `
    const result = db.prepare(insertQuery).run(item.content, item.type, timestamp, item.size, isFavorite);
    
    // 返回插入的记录ID
    return result.lastInsertRowid;
  } catch (error) {
    console.error("Failed to save clipboard item:", error);
    return null;
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
 * 清除过期的剪贴板记录（保留收藏的记录）
 * @param retentionDays 保留天数
 * @returns 清除的记录数量
 */
export function clearExpiredClipboardItems(retentionDays: number) {
  try {
    // 计算过期时间点
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - retentionDays);
    const expiredTimestamp = expiredDate.toISOString();
    
    console.log(`清除 ${expiredTimestamp} 之前的非收藏记录`);
    
    // 删除过期且非收藏的记录
    const deleteQuery = `
      DELETE FROM clipboard_items 
      WHERE timestamp < ? AND is_favorite = 0
    `;
    const result = db.prepare(deleteQuery).run(expiredTimestamp);
    
    // 如果删除了记录，重新整理ID序列
    if (result.changes > 0) {
      // 获取当前最大ID
      const maxIdResult = db.prepare('SELECT MAX(id) as maxId FROM clipboard_items').get();
      const maxId = maxIdResult?.maxId || 0;
      
      // 重置自增序列
      if (maxId > 0) {
        db.prepare(`UPDATE sqlite_sequence SET seq = ? WHERE name = 'clipboard_items'`).run(maxId);
      } else {
        // 如果没有记录了，删除序列记录
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = 'clipboard_items'`).run();
      }
    }
    
    console.log(`已清除 ${result.changes} 条过期记录`);
    return result.changes;
  } catch (error) {
    console.error('Failed to clear expired clipboard items:', error);
    return 0;
  }
}

/**
 * 获取剪贴板历史总数
 * @returns 剪贴板历史总数
 */
export function getClipboardHistoryCount() {
  try {
    const countQuery = `
      SELECT COUNT(*) as total FROM clipboard_items
    `;
    const result = db.prepare(countQuery).get();
    return result.total;
  } catch (error) {
    console.error("Failed to get clipboard history count:", error);
    return 0;
  }
}

/**
 * 获取剪贴板历史（支持分页和按类型筛选）
 * @param page 页码（从1开始）
 * @param pageSize 每页数量
 * @param type 可选的类型筛选
 * @returns 剪贴板历史列表和总数
 */
export function getClipboardHistory(page = 1, pageSize = 50, type = "all") {
  try {
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 根据是否有类型筛选构建不同的查询
    let selectQuery, countQuery;
    let params = [];
    
    if (type && type !== 'all' && type !== 'favorite') {
      // 按类型筛选
      selectQuery = `
        SELECT * FROM clipboard_items 
        WHERE type = ? 
        ORDER BY id DESC LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as total FROM clipboard_items 
        WHERE type = ?
      `;
      params = [type, pageSize, offset];
    } else if (type === 'favorite') {
      // 收藏筛选
      selectQuery = `
        SELECT * FROM clipboard_items 
        WHERE is_favorite = 1 
        ORDER BY id DESC LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as total FROM clipboard_items 
        WHERE is_favorite = 1
      `;
      params = [pageSize, offset];
    } else {
      // 不筛选
      selectQuery = `
        SELECT * FROM clipboard_items 
        ORDER BY id DESC LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as total FROM clipboard_items
      `;
      params = [pageSize, offset];
    }
    
    // 获取总数
    let totalResult;
    if (type && type !== 'all' && type !== 'favorite') {
      totalResult = db.prepare(countQuery).get(type);
    } else if (type === 'favorite') {
      totalResult = db.prepare(countQuery).get();
    } else {
      totalResult = db.prepare(countQuery).get();
    }
    const total = totalResult ? totalResult.total : 0;
    
    // 获取分页数据
    const items = db.prepare(selectQuery).all(...params);
    
    return {
      items,
      total,
      page,
      pageSize
    };
  } catch (error) {
    console.error("Failed to get clipboard history:", error);
    return [];
  }
}

/**
 * 设置剪贴板项目的收藏状态
 * @param id 项目ID
 * @param isFavorite 是否收藏
 * @returns 是否设置成功
 */
export function setFavoriteStatus(id: string, isFavorite: boolean) {
  try {
    const updateQuery = `
      UPDATE clipboard_items SET is_favorite = ? WHERE id = ?
    `
    db.prepare(updateQuery).run(isFavorite ? 1 : 0, id);
    return true;
  } catch (error) {
    console.error("Failed to update favorite status:", error);
    return false;
  }
}

/**
 * 获取收藏的剪贴板项目
 * @returns 收藏的剪贴板项目列表
 */
export function getFavoriteClipboardItems() {
  try {
    const selectQuery = `
      SELECT * FROM clipboard_items WHERE is_favorite = 1 ORDER BY id DESC
    `
    const rows = db.prepare(selectQuery).all();
    return rows;
  } catch (error) {
    console.error("Failed to get favorite clipboard items:", error);
    return [];
  }
}
