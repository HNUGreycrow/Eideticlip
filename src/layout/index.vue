<script setup lang="ts">
import Header from "./header/index.vue";
import Sidebar from "./sidebar/index.vue";
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header height="32px">
        <Header></Header>
      </el-header>
      <el-container class="main-container">
        <Sidebar />
        <el-main>
          <router-view v-slot="{ Component }">
            <keep-alive :include="['clipboard']">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.common-layout {
  display: flex;
  flex: 1;
  margin: 0 auto;
  background: var(--bg-primary);
  overflow: hidden;
}

.el-header,
.el-main {
  padding: 0;
  width: 100%;
}

.el-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.el-main {
  display: flex;
  background: transparent;
}

.main-container {
  height: calc(100vh - 32px);
  overflow: hidden;
}
</style>
