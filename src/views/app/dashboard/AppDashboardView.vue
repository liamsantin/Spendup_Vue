<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { DashboardContent } from '@/features/dashboard';

const { t } = useI18n();
</script>

<template>
    <div class="su-page">
        <header class="su-hero">
            <div class="su-hero__top">
                <h1>{{ t('dashboard.pageTitle') }}</h1>
            </div>
            <p>{{ t('dashboard.subtitle') }}</p>
        </header>
        <div class="su-body">
            <DashboardContent />
        </div>
    </div>
</template>
