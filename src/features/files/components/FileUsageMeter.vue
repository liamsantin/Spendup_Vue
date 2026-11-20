<script setup lang="ts">
/**
 * Consommation de stockage : ligne libellé / détail sur filet fin + jauge carrée 4 px.
 * Ton : bleu (normal), violet (approche du quota), rouge (quota atteint).
 */
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
            class="su-gauge file-usage__track"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="Math.round(percent)"
            :aria-label="label"
        >
            <span class="su-gauge__fill file-usage__fill" :style="{ width: `${percent}%` }" />
        </div>
    </div>
</template>

<style scoped>
.file-usage {
    margin: 0;
}

.file-usage__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
}

.file-usage__label {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
}

.file-usage__meta {
    flex: none;
    font-size: 13px;
    color: var(--gray);
    font-variant-numeric: tabular-nums;
}

.file-usage__track {
    height: 4px;
}

.file-usage.is-ok .file-usage__fill {
    background: var(--blue);
}

.file-usage.is-warn .file-usage__fill {
    background: var(--violet);
}

.file-usage.is-danger .file-usage__fill {
    background: var(--danger);
}

.file-usage.is-danger .file-usage__label {
    color: var(--danger);
}
</style>
