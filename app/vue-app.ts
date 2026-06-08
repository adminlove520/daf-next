/**
 * Vue 应用入口 - 在 Next.js 中挂载 Vue 3 应用
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import AppComponent from './AppComponent.vue';
import router from './router';

import '@arco-design/web-vue/dist/arco.css';
import '../../src/style.css';

// 创建 Vue 应用
const app = createApp(AppComponent);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ArcoVue);
app.use(ArcoVueIcon);

let isMounted = false;

export function mountVueApp() {
  if (isMounted) return;

  const container = document.getElementById('vue-app');
  if (container && !isMounted) {
    app.mount(container);
    isMounted = true;
    console.log('✓ Vue app mounted');
  }
}

export default app;
