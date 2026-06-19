import { createApp, type Plugin } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import 'vue3-perfect-scrollbar/style.css';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueApexCharts from 'vue3-apexcharts';
import VueTablerIcons from 'vue-tabler-icons';
import 'vue3-carousel/dist/carousel.css';

import Maska from 'maska';

//i18
import { createI18n } from 'vue-i18n';
import messages from '@/utils/locales/messages';

//ScrollTop
import VueScrollTo from 'vue-scrollto';

//LightBox
import VueEasyLightbox from 'vue-easy-lightbox';

const i18n = createI18n({
    locale: 'en',
    messages: messages,
    silentTranslationWarn: true,
    silentFallbackWarn: true
});

const app = createApp(App);
app.use(router);

app.use(PerfectScrollbarPlugin);

app.use(createPinia());

app.use(VueTablerIcons);

app.use(i18n);
app.use(Maska);
app.use(VueApexCharts as Plugin);
app.use(vuetify).mount('#app');

//ScrollTop Use
app.use(VueScrollTo, {
    duration: 1000,
    easing: 'ease'
});

//Lightbox
app.use(VueEasyLightbox);
