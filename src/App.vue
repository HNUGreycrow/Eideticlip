<script setup lang="ts">
import { onMounted } from "vue";
import { themeService } from "./utils/theme";
import UpdateDialog from "./components/UpdateDialog.vue";
import router from "./router";

// 在 App.vue 的 onMounted 钩子中添加
onMounted(async () => {
  // 初始化主题
  themeService.initTheme();

  // 主动检查版本
  const currentVersion = await window.ipcRenderer.invoke("app-get-version");
  const savedVersion = await window.config.get("version");

  if (savedVersion !== currentVersion) {
    await window.config.set("version", currentVersion);
    router.push("/changelog");
  }
});
</script>

<template>
  <RouterView></RouterView>
  <UpdateDialog />
</template>

<style>
@import "./styles/themes.css";

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

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei",
    sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

* {
  box-sizing: border-box;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--border-medium);
  border-radius: 3px;
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
  --el-button-text-color: var(--text-inverse);
  --el-button-border-color: var(--accent-blue);
  --el-button-hover-bg-color: var(
    --accent-blue-hover,
    var(--bg-active)
  ); /* 使用主题变量 */
  --el-button-hover-border-color: var(--accent-blue-hover, var(--bg-active));
  --el-button-hover-text-color: var(--text-inverse);
}

.el-input__wrapper {
  background-color: var(--bg-tertiary);
  box-shadow: 0 0 0 1px var(--border-light) inset;
}

.el-input__inner {
  color: var(--text-primary);
}
</style>
