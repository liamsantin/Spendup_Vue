<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { RefreshIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { NetWorthOverviewContent, useNetWorthStore } from '@/features/net-worth';

const { t } = useI18n();
const store = useNetWorthStore();

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void store.load(true).catch(() => undefined);
}

function onRefresh() {
    if (store.loading) return;
    void store.refresh().catch(() => undefined);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void store.bootstrap().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

defineExpose({ refresh: onRefresh });
</script>

<template>
    <AppPageShell :title="t('netWorthPage.title')" :subtitle="t('netWorthPage.subtitle')">
        <template #actions>
            <button type="button" class="su-btn" :disabled="store.loading" @click="onRefresh">
                <RefreshIcon :size="16" stroke-width="1.6" />
                {{ t('netWorthPage.actions.refresh') }}
            </button>
        </template>

        <NetWorthOverviewContent />
    </AppPageShell>
</template>
