<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

function reset() {
    window.location.assign('/demo');
}

async function exit() {
    auth.exitDemo();
    await router.push('/');
}
</script>

<template>
    <section class="su-box demo-banner" role="status">
        <p class="demo-banner__text">{{ t('demo.banner') }}</p>
        <div class="demo-banner__actions">
            <button type="button" class="su-link" @click="reset">{{ t('demo.reset') }}</button>
            <router-link class="su-link" to="/auth?tab=register">{{ t('demo.signup') }}</router-link>
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
