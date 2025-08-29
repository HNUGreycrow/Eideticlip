<script setup lang="ts">
import { ref, onMounted } from 'vue';

const dialogVisible = ref(false);
const appVersion = ref('1.0.0');

// 从electron环境中获取实际版本
onMounted(async () => {
  try {
    const version = await window.ipcRenderer.invoke('app-get-version');
    if (version) {
      appVersion.value = version;
    }
  } catch (error) {
    console.error('获取应用版本失败:', error);
  }
});

const openAboutDialog = () => {
  dialogVisible.value = true;
};

const openGithub = () => {
  window.ipcRenderer.invoke('open-external-url', 'https://github.com/HNUGreycrow/Eideticlip');
};

defineExpose({
  openAboutDialog
});
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="关于 Eideticlip"
    width="400px"
    align-center
    class="about-dialog"
  >
    <div class="about-content">
      <div class="logo">
        <img src="/20250815110628.png" alt="Logo" />
      </div>
      <h2>Eideticlip</h2>
      <p class="version">版本: {{ appVersion }}</p>
      <p class="description">
        Eideticlip 是一个剪贴板管理工具，帮助您管理和组织剪贴板内容。
      </p>
      <div class="divider"></div>
      <!-- <p class="copyright">
        © {{ new Date().getFullYear() }} Clipboard Hub Team
      </p> -->
      <p class="tech">
        基于 Electron + Vue + Vite 构建
      </p>
      <div class="links">
        <el-button type="primary" text size="small" @click="openGithub" class="github-btn">
          <el-icon><i-ep-Link /></el-icon> 项目主页
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 0;
  
  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 16px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
    transition: transform 0.3s ease;
    
    &:hover {
      transform: scale(1.05);
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  
  h2 {
    margin: 0 0 8px;
    font-size: 26px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }
  
  .version, .build-info {
    margin: 0 0 8px;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  .description {
    margin: 10px 0 20px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
  
  .divider {
    width: 100%;
    height: 1px;
    background-color: var(--border-light);
    margin: 0 0 16px;
  }
  
  .copyright, .tech {
    margin: 4px 0;
    font-size: 12px;
    color: var(--text-tertiary);
  }
  
  .links {
    .github-btn {
      transition: transform 0.2s ease;
      
      &:hover {
        transform: translateY(-2px);
      }
    }
  }
}
</style>
