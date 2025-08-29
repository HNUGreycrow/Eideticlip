import { ref } from 'vue';

// 主题类型
export type ThemeType = 'light' | 'dark' | 'pink';

// 创建一个响应式的主题状态
const currentTheme = ref<ThemeType>('dark');

// 获取存储的主题设置
const initTheme = async (): Promise<void> => {
  try {
    // 使用通用配置方法获取主题
    const savedTheme = await window.config.get<ThemeType>('theme');
    if (savedTheme) {
      currentTheme.value = savedTheme;
    } else {
      // 默认使用深色主题
      currentTheme.value = 'dark';
    }
    applyTheme(currentTheme.value);
  } catch (error) {
    console.error('获取主题设置失败:', error);
    // 出错时使用默认主题
    currentTheme.value = 'dark';
    applyTheme('dark');
  }
};

// 切换主题
const toggleTheme = (): void => {
  const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
};

// 设置主题
const setTheme = (theme: ThemeType): void => {
  currentTheme.value = theme;
  // 使用通用配置方法保存主题
  window.config.set('theme', theme).catch((error: any) => {
    console.error('保存主题设置失败:', error);
  });
  applyTheme(theme);
};

// 应用主题到DOM
const applyTheme = (theme: ThemeType): void => {
  document.documentElement.setAttribute('data-theme', theme);
  
  // 为body添加对应的主题类
  document.documentElement.classList.remove('dark', 'light', 'pink');
  document.documentElement.classList.add(theme);
};

// 导出主题服务
export const themeService = {
  currentTheme,
  initTheme,
  toggleTheme,
  setTheme
};