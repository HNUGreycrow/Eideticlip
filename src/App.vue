<script setup lang="ts">
import { onMounted } from 'vue';
import { themeService } from './utils/theme';
import UpdateDialog from './components/UpdateDialog.vue';

onMounted(() => {
  // 初始化主题
  themeService.initTheme();
});
</script>

<template>
  <RouterView></RouterView>
  <UpdateDialog />
</template>

<style>
@import './styles/themes.css';

/* 响应式布局 */
@media (max-width: 768px) {
  :root {
    --detail-width: 280px;
  }
}

@media (max-width: 576px) {
  :root {
    --detail-width: 100%;
  }
}

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

* {
  box-sizing: border-box;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-medium);
}

/* 覆盖Element Plus的一些默认样式 */
.el-button {
  --el-button-bg-color: var(--bg-tertiary);
  --el-button-text-color: var(--text-primary);
  --el-button-border-color: var(--border-light);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-text-color: var(--text-primary);
  --el-button-hover-border-color: var(--border-medium);
}

.el-button--primary {
  --el-button-bg-color: var(--accent-blue);
  --el-button-border-color: var(--accent-blue);
}

.el-input__wrapper {
  background-color: var(--bg-tertiary);
  box-shadow: 0 0 0 1px var(--border-light) inset;
}

.el-input__inner {
  color: var(--text-primary);
}
</style>
