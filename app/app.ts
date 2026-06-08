/**
 * Vue 应用入口文件
 * 将 Vue 3 应用挂载到 Next.js 页面
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import AppComponent from './AppComponent.vue';
import router from './router';

import '@arco-design/web-vue/dist/arco.css';

// 创建 Vue 应用
const app = createApp(AppComponent);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ArcoVue);
app.use(ArcoVueIcon);

// 挂载到 #app 元素
if (typeof document !== 'undefined') {
  const container = document.getElementById('app');
  if (container) {
    app.mount(container);
  }
}

export default app;
