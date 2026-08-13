import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import 'vue3-perfect-scrollbar/style.css';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';

import { i18n } from '@/plugins/i18n';
import { setNativeNotificationNavigate } from '@/features/notifications';
import { isTauri } from '@/utils/helpers/platform-helpers';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(i18n);

if (isTauri()) {
    setNativeNotificationNavigate((path) => {
        void router.push(path);
    });
}

app.use(vuetify).mount('#app');
