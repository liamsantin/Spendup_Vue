<script setup lang="ts">
/**
 * État de synchro d'un fichier, façon drive : icône et libellé court.
 * Dans le navigateur, seul l'état « sur un autre appareil » est affiché.
 */
defineOptions({ name: 'FileSyncBadge' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlertTriangleIcon, CloudCheckIcon, CloudIcon, CloudUploadIcon, DeviceDesktopIcon, DeviceDesktopOffIcon } from 'vue-tabler-icons';
import { useFileSyncStore } from '@/features/files/sync/sync-store';
import type { SyncStatus } from '@/features/files/sync/sync-plan';
import type { FileDto } from '@/features/files/types';

const props = defineProps<{ file: FileDto }>();
const { t } = useI18n();
const sync = useFileSyncStore();

const status = computed<SyncStatus>(() => sync.statusOf(sync.remote.get(props.file.publicId) ?? props.file));
const blocked = computed(() => sync.plan.blocked?.publicId === props.file.publicId);

const icon = computed(() => {
    switch (status.value) {
        case 'synced':
            return CloudCheckIcon;
        case 'cloud':
            return CloudIcon;
        case 'pending':
            return blocked.value ? AlertTriangleIcon : CloudUploadIcon;
        case 'missing':
            return AlertTriangleIcon;
        case 'elsewhere':
            return DeviceDesktopOffIcon;
        default:
            return DeviceDesktopIcon;
    }
});

const label = computed(() => {
    const file = sync.remote.get(props.file.publicId) ?? props.file;
    if (status.value === 'elsewhere') return t('filesPage.sync.status.elsewhere', { device: file.localDevice?.name ?? '—' });
    if (status.value === 'pending' && blocked.value) {
        return t(sync.plan.blockedNeverFits ? 'filesPage.sync.status.neverFits' : 'filesPage.sync.status.blocked');
    }
    return t(`filesPage.sync.status.${status.value}`);
});

/** Dans le navigateur, un fichier en ligne n'a rien à signaler. */
const visible = computed(() => sync.ready || status.value === 'elsewhere');
</script>

<template>
    <span v-if="visible" class="file-sync-badge" :class="[`is-${status}`, { 'is-blocked': blocked }]" :title="label">
        <component :is="icon" :size="14" stroke-width="1.8" aria-hidden="true" />
        <span class="file-sync-badge__label">{{ label }}</span>
    </span>
</template>

<style scoped>
.file-sync-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    line-height: 1.2;
    color: var(--gray);
    white-space: nowrap;
}

.file-sync-badge.is-synced {
    color: var(--blue-ink);
}

.file-sync-badge.is-pending {
    color: var(--blue-ink);
}

.file-sync-badge.is-missing,
.file-sync-badge.is-blocked {
    color: var(--red-ink, #b42318);
}

.file-sync-badge__label {
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
