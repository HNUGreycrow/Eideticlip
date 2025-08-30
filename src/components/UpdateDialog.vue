<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// 更新状态相关的响应式变量
const updateAvailable = ref<boolean>(false);
const updateInfo = ref<any>(null);
const updateProgress = ref<number>(0);
const isDownloading = ref<boolean>(false);
const updateDownloaded = ref<boolean>(false);
const showDialog = ref<boolean>(false);
const currentVersion = ref<string>('1.0.0');

// 控制更新内容折叠状态
const activeCollapse = ref<string[]>([]);

// 清理函数，用于移除事件监听器
let removeUpdateListener: (() => void) | null = null;

// 组件挂载时设置更新状态监听并自动检查更新
onMounted(async () => {
  // 获取当前应用版本
  try {
    const version = await window.ipcRenderer.invoke('app-get-version');
    if (version) {
      currentVersion.value = version;
    }
  } catch (error) {
    console.error('获取应用版本失败:', error);
  }

  // 监听更新状态
  removeUpdateListener = window.updater.onUpdateStatus((status) => {
    console.log('更新状态:', status);
    
    if (status.status === 'update-available') {
      updateAvailable.value = true;
      updateInfo.value = status.data;
      // 添加当前版本信息到更新信息中
      if (updateInfo.value) {
        updateInfo.value.currentVersion = currentVersion.value;
      }
      showDialog.value = true; // 自动显示弹窗
    } else if (status.status === 'update-not-available') {
      updateAvailable.value = false;
    } else if (status.status === 'download-progress') {
      isDownloading.value = true;
      updateProgress.value = status.data.percent || 0;
    } else if (status.status === 'update-downloaded') {
      isDownloading.value = false;
      updateDownloaded.value = true;
    } else if (status.status === 'error') {
      isDownloading.value = false;
    }
  });
  
  // 应用启动时自动检查更新
  setTimeout(async () => {
    try {
      console.log('自动检查更新...');
      await window.updater.checkForUpdates();
    } catch (error) {
      console.error('自动检查更新失败:', error);
    }
  }, 3000); // 延迟3秒检查更新，确保应用已完全加载
});

// 组件卸载时清理事件监听器
onUnmounted(() => {
  if (removeUpdateListener) {
    removeUpdateListener();
  }
});

// 下载更新
const downloadUpdate = async () => {
  try {
    isDownloading.value = true;
    await window.updater.downloadUpdate();
  } catch (error) {
    isDownloading.value = false;
    ElMessage.error('下载更新失败: ' + error);
  }
};

// 安装更新
const installUpdate = async () => {
  try {
    await window.updater.installUpdate();
  } catch (error) {
    ElMessage.error('安装更新失败: ' + error);
  }
};

// 关闭弹窗
const closeDialog = () => {
  showDialog.value = false;
};

// 稍后提醒
const remindLater = () => {
  showDialog.value = false;
};
</script>

<template>
  <el-dialog
    v-model="showDialog"
    title="发现新版本"
    width="450px"
    :close-on-click-modal="false"
    :show-close="true"
    class="update-dialog"
    top="15vh"
  >
    <div class="update-content">
      <div class="update-header">
        <div class="update-icon">
           <img src="/20250815110628.png" class="icon" alt="Logo" />
        </div>
        <h3 class="update-title">新版本可用</h3>
      </div>
      
      <div v-if="updateInfo" class="update-info">
        <div class="version-card">
          <div class="version-item">
            <span class="version-label">当前版本</span>
            <span class="version-value">{{ updateInfo.currentVersion || '未知' }}</span>
          </div>
          <div class="version-divider">
            <i-ep-arrow-right />
          </div>
          <div class="version-item">
            <span class="version-label">新版本</span>
            <span class="version-value highlight">{{ updateInfo.version || '未知' }}</span>
          </div>
        </div>
        
        <div v-if="updateInfo.releaseNotes" class="release-notes">
          <el-collapse v-model="activeCollapse" class="notes-collapse">
            <el-collapse-item title="更新内容" name="releaseNotes">
              <div class="notes-content" v-html="updateInfo.releaseNotes"></div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
      
      <div v-if="isDownloading" class="download-progress">
        <p>正在下载更新...</p>
        <el-progress 
          :percentage="updateProgress" 
          :format="(format: any) => `${format.toFixed(0)}%`"
          :stroke-width="8"
          class="progress-bar"
        />
      </div>
      
      <div class="update-actions">
        <template v-if="!isDownloading && !updateDownloaded">
          <el-button type="primary" @click="downloadUpdate">
            <i-ep-download></i-ep-download>下载更新
          </el-button>
          <el-button @click="remindLater">稍后提醒</el-button>
        </template>
        
        <template v-if="updateDownloaded">
          <el-button type="success" @click="installUpdate">
            <i-ep-check></i-ep-check>立即安装
          </el-button>
          <el-button @click="closeDialog">稍后安装</el-button>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.update-dialog {
  :deep(.el-dialog__header) {
    border-bottom: 1px solid var(--border-light);
    margin-right: 0;
    padding: 16px 20px;
  }
  
  :deep(.el-dialog__body) {
    padding: 24px;
  }
  
  :deep(.el-dialog__title) {
    font-weight: 600;
    font-size: 16px;
  }
  
  :deep(.el-dialog) {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }
}

.update-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.update-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
}

.update-icon {
  margin-bottom: 16px;
  .icon {
    width: 70px;
    height: 70px;
  }
}

.update-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}

.update-info {
  margin-bottom: 12px;
  width: 100%;
}

.version-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.version-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 12px;
}

.version-label {
  font-size: 12px;
  color: var(--text-secondary, #909399);
  margin-bottom: 4px;
}

.version-value {
  font-size: 16px;
  font-weight: 500;
  
  &.highlight {
    color: var(--accent-blue, #409eff);
    font-weight: 600;
  }
}

.version-divider {
  color: var(--text-secondary, #909399);
  margin: 0 8px;
}

.download-progress {
  width: 100%;
  margin-bottom: 20px;
  
  p {
    margin-bottom: 10px;
  }
}

.update-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  
  :deep(.el-button) {
    min-width: 120px;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}
</style>