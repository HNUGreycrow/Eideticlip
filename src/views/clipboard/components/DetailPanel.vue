<template>
  <div class="detail-panel" :class="{ 'is-open': props.isOpen }">
    <div class="detail-header">
      <h3 class="detail-title">{{ item ? "详情" : "无选中项" }}</h3>
      <el-button class="detail-close" @click="closeDetail" text>
        <i-ep-Close />
      </el-button>
    </div>

    <div v-if="item" class="detail-content">
      <div class="detail-type">
        <div class="detail-type-icon" :class="`type-${item.type}`">
          <i-ep-Document v-if="item.type === 'text'" />
          <i-ep-Link v-else-if="item.type === 'url'" />
          <i-ep-Tickets v-else-if="item.type === 'code'" />
          <i-ep-Picture v-else-if="item.type === 'image'" />
          <i-ep-Document v-else />
        </div>
        <span class="detail-type-label">{{ getTypeLabel(item.type) }}</span>
      </div>

      <div class="detail-text">
        <p>{{ item.content }}</p>
      </div>

      <div class="detail-meta">
        <div class="detail-meta-item">
          <span class="meta-label">创建时间</span>
          <span class="meta-value">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>

      <div class="detail-actions">
        <el-button
          class="detail-action-btn"
          style="color: var(--text-inverse)"
          type="primary"
          @click="copyItem(item)"
        >
          <i-ep-Document-Copy class="btn-icon" />
          <span>复制内容</span>
        </el-button>
        <el-button
          class="detail-action-btn"
          :type="item.is_favorite ? 'warning' : 'default'"
          @click="toggleFavorite(item)"
        >
          <i-ep-Star class="btn-icon" :filled="item.is_favorite" />
          <span>{{ item.is_favorite ? "取消收藏" : "收藏" }}</span>
        </el-button>
        <el-button class="detail-action-btn" @click="deleteItem(item)">
          <i-ep-Delete class="btn-icon" />
          <span>删除</span>
        </el-button>
      </div>
    </div>

    <div v-else class="detail-empty">
      <i-ep-Select class="empty-icon" />
      <p class="empty-text">选择一个剪贴板项目查看详情</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClipboardItem } from "@/utils/type";

interface Item extends ClipboardItem {}

const props = defineProps<{
  item: Item | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  copy: [item: Item];
  delete: [item: Item];
  favorite: [item: Item];
}>();

const closeDetail = () => {
  emit("close");
};

const copyItem = (item: Item) => {
  emit("copy", item);
};

const deleteItem = (item: Item) => {
  emit("delete", item);
};

const toggleFavorite = (item: Item) => {
  emit("favorite", item);
};

const getTypeLabel = (type: string) => {
  const labels = {
    text: "文本",
    url: "链接",
    code: "代码",
    image: "图片",
  };
  return labels[type as keyof typeof labels] || "文本";
};

const formatTime = (timestamp: Date) => {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
</script>

<style lang="scss" scoped>
.detail-panel {
  width: 0;
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-light);
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

.detail-panel.is-open {
  width: var(--detail-width, 320px);
  border-left: 1px solid var(--border-light);
}

.detail-panel:not(.is-open) {
  width: 0;
  border-left: none;
}

.detail-header {
  height: 60px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.detail-close {
  font-size: 16px;
}

.detail-content {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-type {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-type-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--bg-active);
}

.detail-type-icon.type-text {
  color: var(--accent-blue);
}

.detail-type-icon.type-url {
  color: var(--accent-green);
}

.detail-type-icon.type-code {
  color: var(--accent-purple);
}

.detail-type-icon.type-image {
  color: var(--accent-red);
}

.detail-type-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.detail-text {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 16px;
  padding-top: 0px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  max-height: 80vh;
  overflow: auto;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.meta-label {
  color: var(--text-secondary);
}

.meta-value {
  color: var(--text-primary);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
  padding-top: 20px;
}

.detail-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-left: 0px;
  color: var(--text-primary);
}

.btn-icon {
  font-size: 16px;
  margin-right: 5px;
}

.detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  padding: 40px 16px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
