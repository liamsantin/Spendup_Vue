<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CloudIcon, DownloadIcon, EyeIcon, PdfIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import FileSyncBadge from '@/features/files/components/sync/FileSyncBadge.vue';
import { useFileSyncStore } from '@/features/files/sync/sync-store';
import { fileSizeParts, formatDocumentDate, formatInstant } from '@/features/files/format';
import type { FileDto } from '@/features/files/types';
import { isCipher } from '@/features/vault/crypto';

const props = defineProps<{
    file: FileDto;
    acting?: boolean;
}>();

const emit = defineEmits<{
    preview: [file: FileDto];
    download: [file: FileDto];
    edit: [file: FileDto];
    delete: [file: FileDto];
    sync: [file: FileDto];
}>();

const { t, locale } = useI18n();
const sync = useFileSyncStore();

/** Contenu seulement sur un autre poste : ligne grisée, ni aperçu ni téléchargement. */
const elsewhere = computed(() => sync.statusOf(sync.remote.get(props.file.publicId) ?? props.file) === 'elsewhere');
/** Réglage de synchro disponible (app de bureau, fichier de ce poste ou en ligne). */
const syncable = computed(() => sync.ready && !elsewhere.value);

const sizeLabel = computed(() => {
    const parts = fileSizeParts(props.file.sizeBytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
});

/** Sous-ligne grise : type de fichier (sigle) · taille, puis la description si elle existe. */
const subLine = computed(() => {
    const type = props.file.extension ? props.file.extension.toUpperCase() : 'PDF';
    return `${type} · ${sizeLabel.value}`;
});

const documentDateLabel = computed(() => (props.file.documentDate ? formatDocumentDate(props.file.documentDate, locale.value) : ''));

const addedLabel = computed(() => formatInstant(props.file.createdAt, locale.value));

/** Nom et description : « illisible » à la place d’un chiffré que le Coffre n’a pas pu ouvrir. */
const nameLabel = computed(() => (isCipher(props.file.nameOriginal) ? t('vault.unreadable') : props.file.nameOriginal));
const descriptionLabel = computed(() =>
    props.file.description ? (isCipher(props.file.description) ? t('vault.unreadable') : props.file.description) : null
);

function onDoubleClick(event: MouseEvent) {
    if (props.acting || elsewhere.value) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('preview', props.file);
}
</script>

<template>
    <tr
        class="app-data-table__row file-table__row"
        :class="{ 'is-elsewhere': elsewhere }"
        :data-file-id="file.publicId"
        @dblclick="onDoubleClick"
    >
        <td>
            <div class="app-data-table__name">
                <span class="su-tile su-tile--rose file-table__tile" aria-hidden="true">
                    <PdfIcon :size="18" stroke-width="1.7" />
                </span>
                <span class="app-data-table__identity">
                    <span class="app-data-table__title">{{ nameLabel }}</span>
                    <span class="app-data-table__muted">{{ descriptionLabel ? `${subLine} · ${descriptionLabel}` : subLine }}</span>
                    <FileSyncBadge :file="file" />
                </span>
            </div>
        </td>
        <td>
            <span v-if="documentDateLabel">{{ documentDateLabel }}</span>
            <span v-else class="app-data-table__muted">—</span>
        </td>
        <td>{{ sizeLabel }}</td>
        <td>{{ addedLabel }}</td>
        <td class="app-data-table__actions-cell" @click.stop>
            <div class="app-data-table__actions">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting || elsewhere"
                    :aria-label="t('filesPage.actions.preview')"
                    @click="emit('preview', file)"
                >
                    <EyeIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting || elsewhere"
                    :aria-label="t('filesPage.actions.download')"
                    @click="emit('download', file)"
                >
                    <DownloadIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    v-if="syncable"
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('filesPage.sync.actions.manage')"
                    :title="t('filesPage.sync.actions.manage')"
                    @click="emit('sync', file)"
                >
                    <CloudIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('filesPage.actions.edit')"
                    @click="emit('edit', file)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('filesPage.actions.delete')"
                    @click="emit('delete', file)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
        </td>
    </tr>
</template>

<style scoped>
.app-data-table__row.file-table__row {
    --tint: var(--t-rose-ink);
}

.file-table__tile {
    flex: none;
}

/* contenu seulement sur un autre poste : grisé */
.file-table__row.is-elsewhere .app-data-table__name,
.file-table__row.is-elsewhere td:not(.app-data-table__actions-cell) {
    opacity: 0.5;
}
</style>
