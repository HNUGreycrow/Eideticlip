<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import DetailPanel from "./components/DetailPanel.vue";
import { ClipboardItem } from "@/utils/type";

// 定义组件名称，用于keep-alive识别
defineOptions({
  name: "clipboard",
});

const activeFilter = ref("all");
const searchQuery = ref("");
const selectedItem = ref<ClipboardItem | null>(null);
const clipboardWatcherActive = ref(true); // 默认开启剪贴板监听
let clipboardWatcherCleanup: (() => void) | null = null; // 剪贴板监听清理函数

// 剪贴板数据
const clipboardData = ref<ClipboardItem[]>([]);

// 获取数据
const getClipboardData = computed(() => {
  // 优化：空搜索时避免不必要的字符串操作
  const query = searchQuery.value.trim().toLowerCase();

  return clipboardData.value.filter((item) => {
    // 类型过滤
    let typeMatch = activeFilter.value === "all";

    // 普通类型过滤
    if (!typeMatch && activeFilter.value !== "favorite") {
      typeMatch = item.type === activeFilter.value;
    }

    // 收藏过滤
    if (!typeMatch && activeFilter.value === "favorite") {
      typeMatch = !!item.is_favorite;
    }

    // 内容搜索过滤 - 如果搜索为空则跳过此检查
    const contentMatch =
      query === "" ||
      (item.content &&
        typeof item.content === "string" &&
        item.content.toLowerCase().includes(query));

    // 同时满足类型和内容过滤条件
    return typeMatch && contentMatch;
  });
});

const isOpen = ref(false);
// 选择项目
const selectItem = (item: ClipboardItem) => {
  selectedItem.value = item;
  isOpen.value = true;
};

// 关闭详情面板
const closeDetail = () => {
  selectedItem.value = null;
  isOpen.value = false;
};

// 切换收藏状态
const toggleFavorite = (item: ClipboardItem, event?: Event) => {
  if (event) event.stopPropagation();
  const newStatus = !item.is_favorite;

  window.clipboard
    .setFavorite(item.id, newStatus)
    .then((success) => {
      if (success) {
        // 更新本地状态
        item.is_favorite = newStatus;
        ElMessage({
          message: newStatus ? "已添加到收藏" : "已取消收藏",
          type: newStatus ? "success" : "info",
        });
      } else {
        console.error("设置收藏状态失败");
        ElMessage({
          message: "操作失败",
          type: "error",
        });
      }
    })
    .catch((error) => {
      console.error("设置收藏状态出错:", error);
      ElMessage({
        message: "操作失败",
        type: "error",
      });
    });
};

// 复制项目
const copyItem = (item: ClipboardItem, event?: Event) => {
  if (event) event.stopPropagation();
  window.clipboard
    .write(item.content)
    .then(() => {
      ElMessage({
        message: "复制成功",
        type: "primary",
      });
    })
    .catch((error) => {
      console.error("复制失败:", error);
      ElMessage({
        message: "复制失败",
        type: "error",
      });
    });
};

// 删除项目
const deleteItem = (itemOrId: ClipboardItem | number, event?: Event) => {
  if (event) event.stopPropagation();

  const id = typeof itemOrId === "number" ? itemOrId : itemOrId.id;

  // 从数据库中删除
  window.clipboard
    .deleteItem(id)
    .then((success) => {
      if (success) {
        loadClipboardHistory();
        // 如果当前选中的是被删除的项目，则清空选中
        if (selectedItem.value?.id === id) {
          selectedItem.value = null;
        }
      } else {
        console.error("删除剪贴板项目失败");
        ElMessage({
          message: "删除失败",
          type: "error",
        });
      }
    })
    .catch((error) => {
      console.error("删除剪贴板项目出错:", error);
      ElMessage({
        message: "删除失败",
        type: "error",
      });
    });
};

// 清空所有
const clearAll = () => {
  ElMessageBox.confirm("确定要清空所有记录吗？", "Warning", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    // 从数据库中清空所有记录
    window.clipboard
      .clearAll()
      .then((success) => {
        if (success) {
          // 清空本地数据
          clipboardData.value = [];
          selectedItem.value = null;
          ElMessage({
            message: "已清空所有记录",
            type: "success",
          });
        } else {
          console.error("清空剪贴板历史失败");
          ElMessage({
            message: "清空失败",
            type: "error",
          });
        }
      })
      .catch((error) => {
        console.error("清空剪贴板历史出错:", error);
        ElMessage({
          message: "清空失败",
          type: "error",
        });
      });
  });
};

const formatSize = (byte: number) => {
  if (byte < 1024) {
    return `${byte} B`;
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(byte) / Math.log(k));
  return `${(byte / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 截断过长的文本
const truncateText = (text: string, maxLength: number) => {
  if (!text || typeof text !== "string") return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// 添加新的剪贴板项目
const addClipboardItem = (content: string) => {
  // 检查内容是否已存在
  const exists = clipboardData.value.some((item) => item.content === content);
  if (exists) return;

  // 判断内容类型
  let type = "text";
  if (content.startsWith("http")) {
    type = "url";
  } else if (
    content.includes("{") ||
    content.includes("function") ||
    content.includes("=>")
  ) {
    type = "code";
  }

  // 计算大小
  const size = formatSize(new Blob([content]).size);

  // 创建新项目
  const newItem: ClipboardItem = {
    id: Date.now(),
    type,
    content,
    timestamp: new Date(),
    size,
  };

  // 保存到数据库
  saveClipboardItem(newItem);
  loadClipboardHistory();
};

// 保存剪贴板项目到数据库
const saveClipboardItem = (item: ClipboardItem) => {
  window.clipboard.saveItem(item).catch((error) => {
    console.error("保存剪贴板项目出错:", error);
  });
};

// 从数据库加载剪贴板历史
const loadClipboardHistory = () => {
  window.clipboard
    .getHistory()
    .then((history) => {
      if (history && Array.isArray(history) && history.length > 0) {
        // 转换日期字符串为Date对象
        const processedHistory = history.map((item) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        clipboardData.value = processedHistory;
        console.log(
          "已从数据库加载剪贴板历史:",
          processedHistory.length,
          "条记录"
        );
      } else {
        console.log("数据库中没有剪贴板历史记录");
        clipboardData.value = [];
      }
    })
    .catch((error) => {
      console.error("从数据库加载剪贴板历史出错:", error);
      ElMessage({
        message: "加载历史记录失败",
        type: "error",
        plain: true,
      });
    });
};

// 启动剪贴板监听
const startClipboardWatcher = () => {
  // 如果已经有监听清理函数，说明监听已经启动，不需要重新启动
  if (clipboardWatcherCleanup) {
    console.log("剪贴板监听已经在运行中，无需重新启动");
    return;
  }

  // 启动监听
  window.clipboard
    .startWatching()
    .then(() => {
      console.log("剪贴板监听已启动");

      // 设置变化回调
      clipboardWatcherCleanup = window.clipboard.onChanged((content) => {
        console.log("剪贴板内容变化:", content);
        if (content && content.trim() !== "") {
          addClipboardItem(content);
        }
      });
    })
    .catch((error) => {
      console.error("启动剪贴板监听失败:", error);
    });
};

// 停止剪贴板监听
const stopClipboardWatcher = () => {
  if (clipboardWatcherCleanup) {
    clipboardWatcherCleanup();
    clipboardWatcherCleanup = null;
  }

  window.clipboard
    .stopWatching()
    .then(() => {
      console.log("剪贴板监听已停止");
    })
    .catch((error) => {
      console.error("停止剪贴板监听失败:", error);
    });
};

// 组件挂载时启动监听，加载历史记录，卸载时停止监听
onMounted(() => {
  // 加载历史记录
  loadClipboardHistory();
  // 启动剪贴板监听
  startClipboardWatcher();
});

onUnmounted(() => {
  console.log("组件卸载");
  stopClipboardWatcher();
});

// 导出数据
const exportData = () => {
  const data = JSON.stringify(clipboardData.value, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clipboard-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  // 这里可以添加导出成功的提示
};

// 格式化时间
const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

// 获取类型标签
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    text: "文本",
    url: "链接",
    code: "代码",
    image: "图片",
  };
  return labels[type] || "文件";
};
</script>

<template>
  <div class="main-content">
    <div class="content-container">
      <!-- 内容头部 -->
      <div class="content-header">
        <div class="header-left">
          <h1 class="header-title">剪切板历史</h1>
          <span class="header-stats">共 {{ clipboardData.length }} 条记录</span>
        </div>
        <div class="header-actions">
          <el-tooltip content="停止/启动自动监听剪贴板" placement="top">
            <el-switch
              v-model="clipboardWatcherActive"
              @change="
                clipboardWatcherActive
                  ? startClipboardWatcher()
                  : stopClipboardWatcher()
              "
              active-text="监听中"
              inactive-text="已停止"
              inline-prompt
            />
          </el-tooltip>
          <el-button class="action-btn" @click="clearAll">
            <i-ep-delete style="margin-right: 3px" /> 清空
          </el-button>
          <el-button
            type="primary"
            class="action-btn primary"
            @click="exportData"
          >
            <i-ep-upload style="margin-right: 3px" /> 导出
          </el-button>
        </div>
      </div>

      <!-- 搜索区域 -->
      <div class="search-container">
        <div class="search-box">
          <i-ep-search class="search-icon" />
          <el-input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索剪切板内容..."
          />
        </div>
        <div class="search-filters">
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'all' }"
            @click="activeFilter = 'all'"
            >全部</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'text' }"
            @click="activeFilter = 'text'"
            >文本</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'url' }"
            @click="activeFilter = 'url'"
            >链接</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'code' }"
            @click="activeFilter = 'code'"
            >代码</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'favorite' }"
            @click="activeFilter = 'favorite'"
            >收藏</span
          >
          <!-- <span
            class="filter-tag"
            :class="{ active: activeFilter === 'image' }"
            @click="activeFilter = 'image'"
            >图片</span
          > -->
        </div>
      </div>

      <!-- 内容列表 -->
      <div class="content-list">
        <template v-if="clipboardData.length === 0">
          <div class="empty-state">
            <i-ep-Document-Copy class="empty-icon" />
            <div class="empty-title">暂无记录</div>
            <div class="empty-desc">开始复制内容，它们会出现在这里</div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="item in getClipboardData"
            :key="item.id"
            class="content-item"
            :class="{
              active: selectedItem?.id === item.id,
              favorite: item.is_favorite,
            }"
            @click="
              copyItem(item, $event);
              selectedItem = item;
            "
          >
            <div class="item-icon">
              <el-icon>
                <i-ep-Document v-if="item.type === 'text'" />
                <i-ep-Link v-else-if="item.type === 'url'" />
                <i-ep-Tickets v-else-if="item.type === 'code'" />
                <i-ep-Picture v-else-if="item.type === 'image'" />
                <i-ep-Document v-else />
              </el-icon>
            </div>
            <div class="item-content">
              <div class="item-title">
                {{ truncateText(item.content, 100) }}
              </div>
              <div class="item-meta">
                <span>{{ formatTime(item.timestamp) }}</span>
                <span>•</span>
                <span>{{ item.size }}</span>
                <span>•</span>
                <span>{{ getTypeLabel(item.type) }}</span>
              </div>
            </div>
            <div class="item-actions">
              <el-button
                class="item-action-btn"
                @click.stop="selectItem(item)"
                title="查看"
              >
                <i-ep-view />
              </el-button>
              <el-button
                class="item-action-btn"
                @click.stop="toggleFavorite(item, $event)"
                :title="item.is_favorite ? '取消收藏' : '收藏'"
              >
                <i-ep-Star class="icon-color" />
              </el-button>
              <el-button
                class="item-action-btn"
                @click.stop="deleteItem(item.id, $event)"
                title="删除"
              >
                <i-ep-Delete />
              </el-button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 详情面板 -->
    <DetailPanel
      :item="selectedItem"
      :is-open="isOpen"
      @close="closeDetail"
      @copy="copyItem"
      @delete="deleteItem"
      @favorite="toggleFavorite"
    />
  </div>
</template>

<style lang="scss" scoped>
:root {
  --detail-width: 320px;
}

.main-content {
  display: flex;
  flex: 1;
  background: var(--bg-primary);
  height: 100%;
  overflow: hidden;
}

/* 内容头部 */
.content-header {
  height: 60px;
  padding: 0 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-stats {
  font-size: 13px;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 0px;
  color: var(--text-primary);

  &.primary {
    color: var(--text-inverse);
  }
}

/* 搜索区域 */
.search-container {
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.search-box {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  z-index: 1;
}

.search-input {
  width: 100%;
}

:deep(.el-input__wrapper) {
  padding-left: 36px;
}

.search-filters {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.filter-tag {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tag:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.filter-tag.active {
  background: var(--accent-blue);
  color: white;
  border-color: var(--accent-blue);
}

.content-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: 100%;
}

/* 内容列表 */
.content-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: var(--bg-primary);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  text-align: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-title {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
}

/* 内容项目 */
.content-item {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  /* 收藏项目特殊样式 */
  &.favorite {
    background: var(--favorite-bg);
    border-left: 3px solid var(--favorite-border);
    position: relative;

    &:hover {
      border-left: 3px solid var(--favorite-border);
    }

    &.active {
      border-color: var(--favorite-border);
    }

    .icon-color {
      color: var(--favorite-border);
      fill: var(--favorite-border);
    }

    &::before {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 20px 20px 0;
      border-color: transparent var(--favorite-corner) transparent transparent;
      z-index: 1;
      border-top-right-radius: 8px;
    }

    &::after {
      content: "★";
      position: absolute;
      top: 0px;
      right: 2px;
      font-size: 10px;
      color: white;
      z-index: 2;
    }
  }
}

.content-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-medium);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.content-item.active {
  background: var(--bg-active);
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 1px var(--accent-blue), 0 3px 10px rgba(0, 136, 255, 0.2);
}

.item-icon {
  width: 38px;
  height: 38px;
  background: var(--bg-active);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  // 标准属性（未来兼容，目前主流浏览器尚未完全支持）
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.item-actions {
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.content-item:hover .item-actions {
  opacity: 1;
}

.item-action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  min-height: auto;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}
</style>
