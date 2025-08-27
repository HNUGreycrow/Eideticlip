<script setup lang="ts">
import { ref } from 'vue';

const dialogVisible = ref(false);
const appVersion = '1.0.0'; // 可以从electron环境中获取实际版本

const openAboutDialog = () => {
  dialogVisible.value = true;
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
        <img src="/electron-vite.svg" alt="Logo" />
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
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 16px;
    
    img {
      width: 100%;
      height: 100%;
    }
  }
  
  h2 {
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .version {
    margin: 0 0 16px;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  .description {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.5;
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
}
</style>
