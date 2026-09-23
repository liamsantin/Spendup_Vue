<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DownloadIcon, EyeIcon, PdfIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { fileSizeParts, formatDocumentDate, formatInstant } from '@/features/files/format';
import type { FileDto } from '@/features/files/types';

const props = defineProps<{
    file: FileDto;
    acting?: boolean;
}>();

const emit = defineEmits<{
    preview: [file: FileDto];
    download: [file: FileDto];
    edit: [file: FileDto];
    delete: [file: FileDto];
}>();

const { t, locale } = useI18n();

const sizeLabel = computed(() => {
    const parts = fileSizeParts(props.file.sizeBytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
});

const documentDateLabel = computed(() =>
    props.file.documentDate ? formatDocumentDate(props.file.documentDate, locale.value) : ''
);

const addedLabel = computed(() => formatInstant(props.file.createdAt, locale.value));

function onDoubleClick(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('preview', props.file);
}
</script>

<template>
    <tr class="app-data-table__row file-table__row" :data-file-id="file.publicId" @dblclick="onDoubleClick">
        <td>
            <div class="app-data-table__name">
                <span class="app-data-table__avatar">
                    <PdfIcon size="16" stroke-width="1.8" />
                </span>
                <span class="app-data-table__identity">
                    <span class="app-data-table__title">{{ file.nameOriginal }}</span>
                    <span v-if="file.description" class="app-data-table__muted">{{ file.description }}</span>
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
                    :disabled="acting"
                    :aria-label="t('filesPage.actions.preview')"
                    @click="emit('preview', file)"
                >
                    <EyeIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('filesPage.actions.download')"
                    @click="emit('download', file)"
                >
                    <DownloadIcon :size="16" stroke-width="1.6" />
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
.file-table__row {
    --tint: rgb(var(--v-theme-error));
}
</style>
