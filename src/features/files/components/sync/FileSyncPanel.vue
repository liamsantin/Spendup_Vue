<script setup lang="ts">
/**
 * Bandeau de synchro de l'écran Fichiers (app de bureau) : proposition d'activer la synchro au premier lancement,
 * conseil d'activer le Coffre, état de la file (en cours, bloquée, en pause) et fichiers seulement sur ce poste.
 */
defineOptions({ name: 'FileSyncPanel' });

import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CloudUploadIcon, FolderIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { formatStorageMo } from '@/features/files/format';
import { useFileSyncStore } from '@/features/files/sync/sync-store';
import { useVaultStore } from '@/features/vault/stores/vault-store';

const { t } = useI18n();
const sync = useFileSyncStore();
const vault = useVaultStore();
const pdfEncrypted = ref(true);

onMounted(async () => {
    pdfEncrypted.value = await vault.canEncrypt('file', 'name_original').catch(() => false);
});

const localOnlyBytes = computed(() => sync.localOnlyHere.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0));
const localOnlyLabel = computed(() =>
    t(
        'filesPage.sync.panel.localOnly',
        { count: sync.localOnlyHere.length, size: t('filesPage.usage.mo', { n: formatStorageMo(localOnlyBytes.value) }) },
        sync.localOnlyHere.length
    )
);

const stateLabel = computed(() => {
    if (sync.pause) return t(`filesPage.sync.pause.${sync.pause}`);
    if (!sync.enabled) return t('filesPage.sync.panel.disabled');
    if (sync.running && sync.progress.total > 0) {
        return t('filesPage.sync.panel.uploading', { done: sync.progress.done, total: sync.progress.total });
    }
    if (sync.plan.blocked) {
        return t(sync.plan.blockedNeverFits ? 'filesPage.sync.panel.neverFits' : 'filesPage.sync.panel.blocked', {
            name: sync.plan.blocked.nameOriginal
        });
    }
    return t('filesPage.sync.panel.upToDate');
});
</script>

<template>
    <div v-if="sync.available" class="file-sync-panel">
        <div v-if="!sync.prompted" class="file-sync-panel__prompt">
            <div class="file-sync-panel__copy">
                <p class="file-sync-panel__title">{{ t('filesPage.sync.prompt.title') }}</p>
                <p class="file-sync-panel__body">{{ t('filesPage.sync.prompt.body') }}</p>
            </div>
            <div class="file-sync-panel__actions">
                <button type="button" class="su-btn su-btn--ghost" @click="sync.dismissPrompt()">
                    {{ t('filesPage.sync.prompt.later') }}
                </button>
                <button type="button" class="su-btn" @click="sync.setEnabled(true)">
                    {{ t('filesPage.sync.prompt.enable') }}
                </button>
            </div>
        </div>

        <AppAlert v-if="!pdfEncrypted" type="warning" class="su-alert">
            {{ t('filesPage.sync.vaultAdvice') }}
        </AppAlert>

        <div class="file-sync-panel__status" role="status">
            <span class="file-sync-panel__item">
                <FolderIcon :size="15" stroke-width="1.7" aria-hidden="true" />
                <span class="file-sync-panel__path" :title="sync.root?.path">{{ sync.root?.path ?? '—' }}</span>
            </span>
            <span class="file-sync-panel__item" :class="{ 'is-alert': sync.pause || sync.plan.blocked }">
                <CloudUploadIcon :size="15" stroke-width="1.7" aria-hidden="true" />
                {{ stateLabel }}
            </span>
            <span v-if="sync.localOnlyHere.length" class="file-sync-panel__item">{{ localOnlyLabel }}</span>
            <span v-if="sync.missing.size" class="file-sync-panel__item is-alert">
                {{ t('filesPage.sync.panel.missing', { count: sync.missing.size }, sync.missing.size) }}
            </span>
        </div>
    </div>
</template>

<style scoped>
.file-sync-panel {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0 0 20px;
}

.file-sync-panel__prompt {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
    padding: 16px 20px;
    border: 1px solid var(--blue-btn);
}

.file-sync-panel__title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
}

.file-sync-panel__body {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--gray);
}

.file-sync-panel__actions {
    display: flex;
    gap: 8px;
}

.file-sync-panel__status {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 20px;
    font-size: 13px;
    color: var(--gray);
}

.file-sync-panel__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.file-sync-panel__item.is-alert {
    color: var(--red-ink, #b42318);
}

.file-sync-panel__path {
    max-width: 360px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
