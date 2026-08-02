import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import 'vue3-perfect-scrollbar/style.css';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueTablerIcons from 'vue-tabler-icons';

import { i18n } from '@/plugins/i18n';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(VueTablerIcons);
app.use(i18n);
app.use(vuetify).mount('#app');
