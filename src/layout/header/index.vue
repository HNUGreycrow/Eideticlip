<script setup lang="ts">

const handleMinimize = () => {
  window.windowControls.minimize();
}

const handleMaximize = () => {
  if (window.windowControls) { // 确保对象存在
    window.windowControls.maximize();
  } else {
    console.error('windowControls 未定义');
  }
}

const handleClose = () => {
  window.windowControls.close();
}
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-left">
      <img src="@/assets/electron.svg" style="width: 20px; height: 20px;"></img>
      <el-text class="mx-1" style="color: var(--text-primary);">Eideticlip</el-text>
    </div>
    </img>
    <div class="titlebar-controls">
      <!-- 最小化按钮 -->
      <el-button class="titlebar-btn minimize-btn" aria-label="最小化窗口" @click="handleMinimize">
        <template #icon> <i-ep-minus /></template>
      </el-button>

      <!-- 最大化/还原按钮 -->
      <el-button class="titlebar-btn maximize-btn" aria-label="最大化窗口" @click="handleMaximize">
        <template #icon> <i-ep-crop /></template>
      </el-button>

      <!-- 关闭按钮 -->
      <el-button class="titlebar-btn close-btn" aria-label="关闭窗口" @click="handleClose">
        <template #icon> <i-ep-close /></template>
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.titlebar {
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  border-radius: 8px 8px 0 0;
  -webkit-app-region: drag;
  user-select: none;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-light);
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  padding-left: 16px;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  position: relative;
  height: 100%;
  margin-right: 4px;
}

// 基础按钮样式
:deep(.titlebar-btn) {
  width: 36px;
  height: 32px;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  margin: 0 2px;
  padding: 0;
  transition: background-color 0.2s ease;

  // 图标居中
  .el-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-secondary);
  }

  // 去除默认聚焦样式
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }

  // 点击效果
  &:active {
    transform: scale(0.95);
  }
}

// 最小化按钮
.minimize-btn:hover {
  background-color: var(--bg-hover);
}

// 最大化按钮
.maximize-btn:hover {
  background-color: var(--bg-hover);
}

// 关闭按钮 - 使用更醒目的红色
.close-btn:hover {
  background-color: var(--accent-red);
}

// 修复按钮点击时的样式问题
:deep(.el-button) {

  &:hover,
  &:focus {
    color: var(--text-primary);
  }

  &:active {
    color: var(--text-primary);
  }
}
</style>
