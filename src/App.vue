<template>
    <a class="skip-link" href="#main-content">{{ t('common.skipToContent') }}</a>
    <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.skip-link {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10000;
    padding: 0.75rem 1rem;
    background: #111827;
    color: #ffffff;
    font-weight: 600;
    text-decoration: none;
    transform: translateY(-120%);
}

.skip-link:focus {
    transform: translateY(0);
    outline: 2px solid #5d87ff;
    outline-offset: 2px;
}
</style>
