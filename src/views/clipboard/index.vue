<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import DetailPanel from "./components/DetailPanel.vue";
import { ClipboardItem } from "@/utils/type";
import { formatSize, getContentType, formatTime, getTypeLabel } from "@/utils/utils";

// 定义组件名称，用于keep-alive识别
defineOptions({
  name: "clipboard",
});

const activeFilter = ref("all");
const searchQuery = ref("");
// 添加防抖后的搜索查询
const debouncedSearchQuery = ref("");
const selectedItem = ref<ClipboardItem | null>(null);
const clipboardWatcherActive = ref(true); // 默认开启剪贴板监听
let clipboardWatcherCleanup: (() => void) | null = null; // 剪贴板监听清理函数

// 剪贴板数据
const clipboardData = ref<ClipboardItem[]>([]);

// 监听类型过滤器变化，重新加载数据
watch(activeFilter, (newType) => {
  // 切换类型时，重置页码并重新加载数据
  currentPage.value = 1;
  loadClipboardHistory(1, false, newType);
});

// 搜索防抖定时器
let searchDebounceTimer: number | null = null;

// 实现搜索防抖功能
watch(searchQuery, (newValue) => {
  // 清除之前的定时器
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer);
  }

  // 设置新的定时器，300ms后更新防抖后的搜索查询
  searchDebounceTimer = window.setTimeout(() => {
    debouncedSearchQuery.value = newValue;
    searchDebounceTimer = null;
  }, 300);
});

/**
 * 计算过滤后的剪贴板数据
 * @returns {ClipboardItem[]} 过滤后的项目列表
 */
const getClipboardData = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLowerCase();
  
  // 数据库已经按类型过滤，这里只需要处理搜索查询
  if (!query) {
    // 没有搜索查询，直接返回数据库过滤后的结果
    return clipboardData.value;
  }
  
  // 有搜索查询时，在数据库过滤结果上进行内容搜索
  // 优化：对于大量数据，使用索引检查而不是includes可以提高性能
  return clipboardData.value.filter((item) => {
    if (!item.content || typeof item.content !== "string") return false;
    const lowerContent = item.content.toLowerCase();
    return lowerContent.indexOf(query) !== -1;
  });
});

const isOpen = ref(false);
/**
 * 选择剪贴板项目
 * @param {ClipboardItem} item - 待选择的项目
 * @returns {void}
 */
const selectItem = (item: ClipboardItem) => {
  selectedItem.value = item;
  isOpen.value = true;
};

/**
 * 关闭详情面板
 * @returns {void}
 */
const closeDetail = () => {
  selectedItem.value = null;
  isOpen.value = false;
};

/**
 * 切换收藏状态
 * @param {ClipboardItem} item - 待切换收藏状态的项目
 * @param {Event} [event] - 可选的事件对象，用于阻止事件冒泡
 * @returns {void}
 */
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

/**
 * 复制项目内容到剪贴板
 * @param {ClipboardItem} item - 待复制的项目
 * @param {Event} [event] - 可选的事件对象，用于阻止事件冒泡
 * @returns {void}
 */
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

/**
 * 删除剪贴板项目
 * @param {ClipboardItem | number} itemOrId - 待删除的项目或项目ID
 * @param {Event} [event] - 可选的事件对象，用于阻止事件冒泡
 * @returns {void}
 */
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

/**
 * 清空所有剪贴板项目
 * @returns {void}
 */
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

/**
 * 截断超长文本，超出部分追加 "..."
 * @param {string} text - 原始文本
 * @param {number} maxLength - 保留最大长度
 * @returns {string} 截断后的结果
 */
const truncateText = (text: string, maxLength: number) => {
  if (!text || typeof text !== "string") return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// 添加新的剪贴板项目
const addClipboardItem = async (content: string) => {
  // 检查内容是否已存在
  const exists = clipboardData.value.some((item) => item.content === content);
  if (exists) return;

  // 确定内容类型
  const type = getContentType(content);

  // 计算大小
  const size = formatSize(new Blob([content]).size);

  // 创建新项目
  let newItem: ClipboardItem = {
    id: Date.now(),
    type,
    content,
    timestamp: new Date(),
    size,
  };

  // 保存到数据库并获取生成的ID
  try {
    const savedItemId = await saveClipboardItem(newItem);
    if (savedItemId) {
      // 确保savedItemId是一个有效的ID
      if (typeof savedItemId === 'number') {
        newItem.id = savedItemId;
      } else {
        console.error('保存项目时返回的ID无效');
      }
      // 使用返回的项目id
      clipboardData.value = [newItem, ...clipboardData.value];
    } else {
      // 如果保存失败，重新加载数据以保持一致性
      loadClipboardHistory();
    }
  } catch (error) {
    console.error('添加剪贴板项目失败:', error);
    // 保存失败时重新加载数据
    loadClipboardHistory();
  }
};

/**
 * 保存单个剪贴板项到数据库
 * @param {ClipboardItem} item - 待保存的数据
 * @returns {Promise<number | null>} 返回保存后的项目ID（包含数据库生成的ID）
 */
const saveClipboardItem = async (item: ClipboardItem): Promise<number | null> => {
  try {
    const savedItemId = await window.clipboard.saveItem(item);
    return savedItemId;
  } catch (error) {
    console.error("保存剪贴板项目出错:", error);
    return null;
  }
};

// 分页加载配置
const pageSize = ref(50); // 每页加载的项目数量
const currentPage = ref(1); // 当前页码
const totalItems = ref(0); // 总项目数
const isLoadingMore = ref(false); // 是否正在加载更多

/**
 * 分页加载剪贴板历史
 * @param {number} [page=1] - 页码
 * @param {boolean} [append=false] - 是否追加模式
 * @param {string} [type] - 筛选类型
 * @returns {Promise<void>}
 */
const loadClipboardHistory = (page = 1, append = false, type = activeFilter.value) => {
  isLoadingMore.value = true;
  currentPage.value = page;

  // 获取总数和历史记录，传入当前选中的类型
  window.clipboard
    .getHistory(page, pageSize.value, type)
    .then((result) => {
      if (result && result.total !== undefined) {
        totalItems.value = result.total;
      }
      // console.log(result);
      const history = result?.items || [];

      if (history && Array.isArray(history) && history.length > 0) {
        // 转换日期字符串为Date对象
        const processedHistory = history.map((item) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));

        if (append && page > 1) {
          // 追加模式：添加到现有数据末尾
          clipboardData.value = [...clipboardData.value, ...processedHistory];
        } else {
          // 替换模式：完全替换现有数据
          clipboardData.value = processedHistory;
        }

        console.log(
          "已从数据库加载剪贴板历史:",
          processedHistory.length,
          "条记录"
        );
      } else if (!append) {
        console.log("数据库中没有剪贴板历史记录");
        clipboardData.value = [];
      }
      isLoadingMore.value = false;
    })
    .catch((error) => {
      console.error("从数据库加载剪贴板历史出错:", error);
      ElMessage({
        message: "加载历史记录失败",
        type: "error",
        plain: true,
      });
      isLoadingMore.value = false;
    });
};

/**
 * 加载更多剪贴板历史数据
 * @returns {void}
 */
const loadMoreData = () => {
  if (isLoadingMore.value) return;
  if (clipboardData.value.length >= totalItems.value) return;

  const nextPage = currentPage.value + 1;
  loadClipboardHistory(nextPage, true, activeFilter.value);
};

/**
 * 启动剪贴板监听
 * @returns {void}
 */
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
      // 设置变化回调
      clipboardWatcherCleanup = window.clipboard.onChanged(async (content) => {
        if (content && content.trim() !== "") {
          await addClipboardItem(content);
        }
      });
    })
    .catch((error) => {
      console.error("启动剪贴板监听失败:", error);
    });
};

/**
 * 停止剪贴板监听
 * @returns {void}
 */
const stopClipboardWatcher = () => {
  // 停止监听
  if (clipboardWatcherCleanup) {
    clipboardWatcherCleanup();
    clipboardWatcherCleanup = null;

    window.clipboard
      .stopWatching()
      .then(() => {
        console.log("剪贴板监听已停止");
      })
      .catch((error) => {
        console.error("停止剪贴板监听失败:", error);
      });
  }
};

// 滚动相关变量和引用
const contentListRef = ref<HTMLElement | null>(null);
const scrollThreshold = 200; // 距离底部多少像素时触发加载更多

/**
 * 处理滚动事件，实现懒加载更多数据
 * @returns {void}
 */
const handleScroll = () => {
  if (!contentListRef.value) return;

  const { scrollTop, scrollHeight, clientHeight } = contentListRef.value;
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;

  // 当滚动到接近底部时，加载更多数据
  if (distanceToBottom < scrollThreshold && !isLoadingMore.value) {
    loadMoreData();
  }
};

// 组件挂载时启动监听，加载历史记录，卸载时停止监听
onMounted(() => {
  // 加载历史记录（只加载第一页）
  loadClipboardHistory(1, false, activeFilter.value);
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
</script>

<template>
  <div class="main-content">
    <div class="content-container">
      <!-- 内容头部 -->
      <div class="content-header">
        <div class="header-left">
          <h1 class="header-title">剪切板历史</h1>
          <span class="header-stats">共 {{ totalItems }} 条记录 (已加载 {{ clipboardData.length }} 条)</span>
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
            ><i-ep-Menu></i-ep-Menu> 全部</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'text' }"
            @click="activeFilter = 'text'"
            ><i-ep-Document></i-ep-Document> 文本</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'url' }"
            @click="activeFilter = 'url'"
            ><i-ep-Link></i-ep-Link> 链接</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'code' }"
            @click="activeFilter = 'code'"
            ><i-ep-Tickets></i-ep-Tickets> 代码</span
          >
          <span
            class="filter-tag"
            :class="{ active: activeFilter === 'favorite' }"
            @click="activeFilter = 'favorite'"
            ><i-ep-star></i-ep-star> 收藏</span
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
      <div class="content-list" ref="contentListRef" @scroll="handleScroll">
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
                <i-ep-Document style="color: var(--accent-blue);" v-if="item.type === 'text'" />
                <i-ep-Link style="color: var(--accent-green);" v-else-if="item.type === 'url'" />
                <i-ep-Tickets style="color: var(--accent-purple);" v-else-if="item.type === 'code'" />
                <i-ep-Picture style="color: var(--accent-red);" v-else-if="item.type === 'image'" />
                <i-ep-Document style="color: var(--accent-blue);" v-else />
              </el-icon>
            </div>
            <div class="item-content">
              <div class="item-title">
                {{ truncateText(item.content, 100) }}
              </div>
              <div class="item-meta">
                <span class="meta-time">
                  <i-ep-Clock class="meta-icon" /> {{ formatTime(item.timestamp) }}
                </span>
                <span class="meta-size">
                  <i-ep-Document-Checked class="meta-icon" /> {{ item.size }}
                </span>
                <span class="meta-type" :class="`type-${item.type}`">
                  <i-ep-InfoFilled class="meta-icon" /> {{ getTypeLabel(item.type) }}
                </span>
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
          <!-- 全部加载完毕提示 -->
          <div
            v-if="
              !isLoadingMore &&
              clipboardData.length >= totalItems &&
              clipboardData.length > 0
            "
            class="load-complete"
          >
            <span>已加载全部内容</span>
          </div>
        </template>
      </div>

      <!-- 加载更多指示器 -->
      <div v-if="isLoadingMore && currentPage > 1" class="loading-more">
        <el-icon class="is-loading"><i-ep-Loading /></el-icon>
        <span>加载更多...</span>
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
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.filter-tag {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 3px;
  
  &[data-type="text"]::before {
    background-color: rgba(52, 152, 219, 0.9);
  }
  
  &[data-type="url"]::before {
    background-color: rgba(46, 204, 113, 0.9);
  }
  
  &[data-type="code"]::before {
    background-color: rgba(155, 89, 182, 0.9);
  }
  
  &[data-type="favorite"]::before {
    background-color: rgba(231, 76, 60, 0.9);
  }
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
  scroll-behavior: smooth;
  position: relative;
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
  border: 2px solid var(--border-light);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 13px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  display: flex;
  align-items: center;
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
      border: 2px solid transparent;
      border-left: 3px solid var(--favorite-border);
      background-image: linear-gradient(var(--bg-active), var(--bg-active)), 
                        linear-gradient(135deg, var(--favorite-border) 0%, var(--accent-red) 100%);
      background-origin: border-box;
      background-clip: padding-box, border-box;
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
  border: 2px solid transparent;
  background-image: linear-gradient(var(--bg-hover), var(--bg-hover)), 
                    linear-gradient(135deg, var(--gradient-hover-start) 0%, var(--gradient-hover-end) 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.content-item.active {
  background: var(--bg-active);
  border: 2px solid transparent;
  background-image: linear-gradient(var(--bg-active), var(--bg-active)), 
                    linear-gradient(135deg, var(--gradient-active-start) 0%, var(--gradient-active-end) 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 3px 10px rgba(0, 136, 255, 0.2);
}

.item-icon {
  width: 42px;
  height: 42px;
  background: var(--bg-active);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 4px rgba(0, 0, 0, 0.1);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  // 标准属性（未来兼容，目前主流浏览器尚未完全支持）
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  letter-spacing: 0.01em;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  
  .meta-icon {
    font-size: 12px;
    margin-right: 4px;
    opacity: 0.9;
    vertical-align: -2px;
  }
  
  .meta-time, .meta-size, .meta-type {
    display: inline-flex;
    align-items: center;
  }
  
  .meta-type {
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.04);
    font-weight: 500;
    font-size: 11px;
    
    &.type-text {
      background: rgba(52, 152, 219, 0.1);
      color: rgba(52, 152, 219, 0.9);
    }
    
    &.type-url {
      background: rgba(46, 204, 113, 0.1);
      color: rgba(46, 204, 113, 0.9);
    }
    
    &.type-code {
      background: rgba(155, 89, 182, 0.1);
      color: rgba(155, 89, 182, 0.9);
    }
    
    &.type-image {
      background: rgba(231, 76, 60, 0.1);
      color: rgba(231, 76, 60, 0.9);
    }
  }
}

.item-actions {
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
  gap: 6px;
}

.content-item:hover .item-actions {
  opacity: 1;
}

.item-action-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  min-height: auto;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  margin-left: 2px;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
  }
}

/* 加载指示器样式 */
.loading-indicator,
.loading-more,
.load-complete {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 14px;
  gap: 8px;
}

.loading-more {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
}

.load-complete {
  padding: 12px;
  color: var(--text-tertiary);
  font-size: 13px;
  border-top: 1px dashed var(--border-light);
  margin-top: 4px;
}
</style>
