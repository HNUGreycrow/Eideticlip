import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
// 引入Element Plus的深色主题变量
import 'element-plus/theme-chalk/dark/css-vars.css'


const app = createApp(App)
app.use(router)
app.mount('#app')
