<script setup lang="ts">
defineOptions({ name: 'FileUsageMeter' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatStorageMo, usagePercent, usageTone } from '@/features/files/format';
import type { FileUsage } from '@/features/files/types';

const props = defineProps<{
    usage: FileUsage;
}>();

const { t } = useI18n();

function moLabel(bytes: number) {
    return t('filesPage.usage.mo', { n: formatStorageMo(bytes) });
}

const label = computed(() => {
    const used = moLabel(props.usage.usedBytes);
    if (props.usage.isUnlimited) return t('filesPage.usage.usedUnlimited', { used });
    return t('filesPage.usage.usedOfQuota', { used, quota: moLabel(props.usage.quotaBytes) });
});

const meta = computed(() =>
    t('filesPage.usage.meta', {
        documents: t('filesPage.usage.documents', { count: props.usage.fileCount }, props.usage.fileCount),
        unique: t('filesPage.usage.unique', { count: props.usage.uniqueBlobCount }, props.usage.uniqueBlobCount)
    })
);

const percent = computed(() => usagePercent(props.usage));
const tone = computed(() => usageTone(props.usage));
</script>

<template>
    <div class="file-usage" :class="`is-${tone}`">
        <div class="file-usage__head">
            <span class="file-usage__label">{{ label }}</span>
            <span class="file-usage__meta">{{ meta }}</span>
        </div>
        <div
            v-if="!usage.isUnlimited"
            class="file-usage__track"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="Math.round(percent)"
            :aria-label="label"
        >
            <span class="file-usage__fill" :style="{ width: `${percent}%` }" />
        </div>
    </div>
</template>

<style scoped>
.file-usage {
    margin: 0 0 14px;
}

.file-usage__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
}

.file-usage__label {
    font-size: 0.82rem;
    font-weight: 650;
    color: var(--ink);
}

.file-usage__meta {
    flex: none;
    font-size: 0.78rem;
    color: var(--ink-muted);
}

.file-usage__track {
    height: 6px;
    border-radius: 999px;
    background: var(--hair);
    overflow: hidden;
}

.file-usage__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.25s var(--ease);
}

.file-usage.is-ok .file-usage__fill {
    background: rgb(var(--v-theme-success));
}

.file-usage.is-warn .file-usage__fill {
    background: rgb(var(--v-theme-warning));
}

.file-usage.is-danger .file-usage__fill {
    background: rgb(var(--v-theme-error));
}

.file-usage.is-danger .file-usage__label {
    color: rgb(var(--v-theme-error));
}
</style>
