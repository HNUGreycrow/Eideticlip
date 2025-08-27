<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { themeService } from "../../utils/theme";
import type { ThemeType } from "../../utils/theme";
import { checkShortcut } from "@/utils/validate";
// 使用预加载脚本中暴露的API，而不是直接导入electron

defineOptions({
  name: "settings",
});

// 使用主题服务中的当前主题
const theme = ref<ThemeType>("dark");
const shortcut = ref("CommandOrControl+Alt+C");
const tempKeys = ref<string[]>([]);
const isRecording = ref(false);
const shortcutInput = ref();

// 点击输入框时清空内容并开始记录
const startRecording = () => {
  tempKeys.value = [];
  isRecording.value = true;
};

// 输入框失去焦点
const onBlur = () => {
  isRecording.value = false;
};

// 按键按下时记录按键
const onKeyDown = (e: KeyboardEvent) => {
  if (!isRecording.value) return;

  e.preventDefault();
  tempKeys.value = [];

  if (e.ctrlKey) {
    tempKeys.value.push("CommandOrControl");
  }
  if (e.altKey) {
    tempKeys.value.push("Alt");
  }
  if (e.shiftKey) {
    tempKeys.value.push("Shift");
  }
  if (e.metaKey && !e.ctrlKey) tempKeys.value.push("Command");
  if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
    tempKeys.value.push(e.key.toUpperCase());
  }
};

// 按键松开时更新快捷键
const onKeyUp = (_e: KeyboardEvent) => {
  if (!isRecording.value || tempKeys.value.length === 0) return;

  const newShortcut = tempKeys.value.join("+");
  const checkResult = checkShortcut(newShortcut);
  // 检查设置快捷键
  if (checkResult.success) {
    if (newShortcut !== shortcut.value) {
      // 临时保存当前快捷键，以便在失败时恢复
      const oldShortcutValue = shortcut.value;

      // 使用once方法注册一次性监听器
      window.ipcRenderer.once("shortcut-update-result", (_event, result) => {
        console.log("收到快捷键更新结果:", result);
        // 取消输入框焦点
        shortcutInput.value?.blur();
        if (!result.success) {
          shortcut.value = result.shortcut || shortcut.value;
          ElMessage.error(`快捷键设置失败: ${result.error}`);
        } else {
          ElMessage.success("快捷键设置成功");
        }
      });

      // 发送快捷键更新请求
      window.ipcRenderer.send("update-shortcut", {
        oldShortcut: oldShortcutValue,
        newShortcut,
      });
      console.log("发送快捷键更新请求:", oldShortcutValue, "->", newShortcut);

      // 临时更新显示的快捷键
      shortcut.value = newShortcut;
    }
  } else {
    // 显示错误提示
    ElMessage.error(checkResult.error);
  }

  // 停止记录
  isRecording.value = false;
  shortcutInput.value?.blur();
};

// 显示当前按下的按键
const displayKeys = computed(() => {
  return isRecording.value
    ? tempKeys.value.length > 0
      ? tempKeys.value.join("+")
      : "按下任意键"
    : shortcut.value;
});

onMounted(() => {
  // 初始化主题值
  theme.value = themeService.currentTheme.value;
});

// 组件卸载时的清理工作
onUnmounted(() => {
  // 不再需要移除事件监听器，因为我们使用的是once方法
});

// 切换主题
const handleThemeChange = (value: ThemeType) => {
  themeService.setTheme(value);
};
</script>

<template>
  <div class="settings-container">
    <div class="content-header">
      <h2 style="font-size: 18px">设置</h2>
    </div>
    <div class="content">
      <el-card style="width: 100%" class="setting-card">
        <template #header>
          <div class="card-header">
            <span>常规设置</span>
          </div>
        </template>
        <div class="setting-item">
          <div class="setting-label">
            <span>深色主题</span>
            <div class="setting-description">使用深色界面主题</div>
          </div>
          <el-switch
            v-model="theme"
            active-value="dark"
            inactive-value="light"
            @change="handleThemeChange"
          ></el-switch>
        </div>
        <div class="setting-item">
          <div class="setting-label">
            <span>启动快捷键</span>
            <div class="setting-description">设置应用启动快捷键</div>
          </div>
          <el-tooltip placement="top-start">
            <template #content>
              例如：<br />
              Ctrl+Alt+C、Ctrl+Shift+V、Alt+` <br />
              修饰键：Ctrl、Alt、Shift、Win（任选其一或两两组合） <br />
              普通键：字母 A-Z、数字 0-9、F1-F12 等
            </template>
            <el-icon style="margin-right: 10px"><i-ep-Warning /></el-icon>
          </el-tooltip>
          <el-input
            v-model="displayKeys"
            ref="shortcutInput"
            style="width: 30%"
            placeholder="点击后按下快捷键"
            @focus="startRecording"
            @blur="onBlur"
            @keydown="onKeyDown"
            @keyup="onKeyUp"
          ></el-input>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-container {
  height: 100%;
  width: 100%;
}

.content-header {
  height: 60px;
  padding: 0 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
}

.content {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.setting-card {
  border-radius: 8px;
  background: var(--bg-secondary);
}

:deep(.setting-item) {
  display: flex;
  align-items: center;
  margin-bottom: 15px;

  .setting-label {
    margin-right: auto;
  }

  .setting-description {
    font-size: 12px;
    color: var(--text-secondary);
  }
}
</style>
