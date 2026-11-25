<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { DEMO_HOME } from '@/features/demo/session';
import { crossHref } from '@/utils/helpers/app-target';

const { t } = useI18n();
const router = useRouter();

function back() {
    void router.push(DEMO_HOME);
}
</script>

<template>
    <section class="su-box demo-locked">
        <h1>{{ t('demo.lockedTitle') }}</h1>
        <p>{{ t('demo.lockedText') }}</p>
        <div class="demo-locked__actions">
            <a class="su-btn su-btn--ink" :href="crossHref('app', '/auth?tab=register')">{{ t('demo.signup') }}</a>
            <button type="button" class="su-btn" @click="back">{{ t('demo.back') }}</button>
        </div>
    </section>
</template>

<style scoped>
.demo-locked {
    max-width: 36rem;
    margin-top: 8px;
    gap: 12px;
    display: flex;
    flex-direction: column;
}

h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

p {
    margin: 0;
    color: var(--gray);
    font-size: 13.5px;
    line-height: 1.45;
}

.demo-locked__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
}
</style>
