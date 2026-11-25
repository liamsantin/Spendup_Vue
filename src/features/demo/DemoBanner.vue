<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { IMPORTS_BASE } from '@/features/imports/paths';
import { asAppPath, DEMO_HOME } from '@/features/demo/session';
import { crossHref } from '@/utils/helpers/app-target';

const { t } = useI18n();
const auth = useAuthStore();
const route = useRoute();

/** Pages d'import : le bandeau rappelle que le relevé ne quitte pas le navigateur. */
const onImports = computed(() => {
    const path = asAppPath(route.path);
    return path === IMPORTS_BASE || path.startsWith(`${IMPORTS_BASE}/`);
});

function reset() {
    window.location.assign(DEMO_HOME);
}

function exit() {
    auth.exitDemo();
    window.location.assign(crossHref('landing', '/'));
}
</script>

<template>
    <section class="su-box demo-banner" role="status">
        <p class="demo-banner__text">
            {{ t('demo.banner') }}
            <template v-if="onImports">
                <br />
                {{ t('demo.importPromise') }}
            </template>
        </p>
        <div class="demo-banner__actions">
            <button type="button" class="su-link" @click="reset">{{ t('demo.reset') }}</button>
            <a class="su-link" :href="crossHref('app', '/auth?tab=register')">{{ t('demo.signup') }}</a>
            <button type="button" class="su-link" @click="exit">{{ t('demo.exit') }}</button>
        </div>
    </section>
</template>

<style scoped>
.demo-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 16px;
    margin-bottom: 24px;
}

.demo-banner__text {
    margin: 0;
    color: var(--ink);
    font-size: 13.5px;
    line-height: 1.45;
}

.demo-banner__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
}

button.su-link {
    appearance: none;
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
}
</style>
