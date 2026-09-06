import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import '@/layouts/shell/assets/tokens.css';
import '@/layouts/shell/assets/motion.css';
import '@/assets/glass.css';
import 'vue3-perfect-scrollbar/style.css';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';

import { i18n } from '@/plugins/i18n';
import { registerDesktopDeepLinks } from '@/features/desktop';
import { setNativeNotificationNavigate } from '@/features/notifications';
import { isTauri } from '@/utils/helpers/platform-helpers';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(i18n);

if (isTauri()) {
    const navigate = (path: string) => {
        void router.push(path);
    };
    setNativeNotificationNavigate(navigate);
    void registerDesktopDeepLinks(navigate);
}

app.use(vuetify).mount('#app');
