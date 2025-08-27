import { ref } from 'vue';

// 主题类型
export type ThemeType = 'light' | 'dark';

// 创建一个响应式的主题状态
const currentTheme = ref<ThemeType>('dark');

// 获取本地存储的主题设置
const initTheme = (): void => {
  const savedTheme = localStorage.getItem('theme') as ThemeType;
  if (savedTheme) {
    currentTheme.value = savedTheme;
  } else {
    // 默认使用深色主题
    currentTheme.value = 'dark';
  }
  applyTheme(currentTheme.value);
};

// 切换主题
const toggleTheme = (): void => {
  const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
};

// 设置主题
const setTheme = (theme: ThemeType): void => {
  currentTheme.value = theme;
  localStorage.setItem('theme', theme);
  applyTheme(theme);
};

// 应用主题到DOM
const applyTheme = (theme: ThemeType): void => {
  document.documentElement.setAttribute('data-theme', theme);
  
  // 为body添加对应的主题类
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
};

// 导出主题服务
export const themeService = {
  currentTheme,
  initTheme,
  toggleTheme,
  setTheme
};