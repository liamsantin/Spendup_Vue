<script setup lang="ts">
/**
 * Ligne de fichier (téléphone) : carré 36 px teinté | nom 700 + type · taille · date en gris | actions.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DownloadIcon, EyeIcon, PdfIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { useRowTap } from '@/components/shared/board/useRowTap';
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

const dateLabel = computed(() => {
    if (props.file.documentDate) return formatDocumentDate(props.file.documentDate, locale.value);
    return formatInstant(props.file.createdAt, locale.value);
});

const subLine = computed(() => {
    const type = props.file.extension ? props.file.extension.toUpperCase() : 'PDF';
    const bits = [type, sizeLabel.value];
    if (props.file.documentDate) bits.push(dateLabel.value);
    else bits.push(t('filesPage.list.addedOn', { date: dateLabel.value }));
    return bits.join(' · ');
});

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('preview', props.file);
}

const tap = useRowTap(
    () => emit('preview', props.file),
    () => !props.acting
);
</script>

<template>
    <div
        class="file-row"
        :class="{ 'file-row--editable': !acting }"
        :data-file-id="file.publicId"
        @click="onActivate"
        @touchstart.passive="tap.onTouchstart"
        @touchend="tap.onTouchend"
        @touchcancel="tap.onTouchcancel"
    >
        <span class="su-tile su-tile--rose file-row__tile" aria-hidden="true">
            <PdfIcon :size="18" stroke-width="1.7" />
        </span>

        <div class="file-row__meta">
            <p class="file-row__name">{{ file.nameOriginal }}</p>
            <p class="file-row__sub">{{ subLine }}</p>
            <p v-if="file.description" class="file-row__sub">{{ file.description }}</p>
        </div>

        <div class="file-row__actions">
            <button
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('filesPage.actions.preview')"
                @click.stop="emit('preview', file)"
            >
                <EyeIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('filesPage.actions.download')"
                @click.stop="emit('download', file)"
            >
                <DownloadIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb"
                :disabled="acting"
                :aria-label="t('filesPage.actions.edit')"
                @click.stop="emit('edit', file)"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
            </button>
            <button
                type="button"
                class="su-orb su-orb--danger"
                :disabled="acting"
                :aria-label="t('filesPage.actions.delete')"
                @click.stop="emit('delete', file)"
            >
                <TrashIcon :size="16" stroke-width="1.6" />
            </button>
        </div>
    </div>
</template>

<style scoped>
/* ligne sur filet fin, sans fond ni ombre */
.file-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    width: 100%;
    min-width: 0;
    min-height: 56px;
    padding: 12px 0;
    box-sizing: border-box;
    border-top: 1px solid var(--line);
    color: inherit;
    transition: background 0.15s var(--ease);
}

.file-row:last-child {
    border-bottom: 1px solid var(--line);
}

.file-row--editable {
    cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
    .file-row:hover {
        background: var(--soft);
    }
}

@media (prefers-reduced-motion: reduce) {
    .file-row {
        transition: none;
    }
}

.file-row__tile {
    flex: none;
}

.file-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.file-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.006em;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-row__sub {
    margin: 0;
    font-size: 13px;
    color: var(--gray);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
}

.file-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
}

@media (max-width: 600px) {
    .file-row {
        flex-wrap: wrap;
        gap: 8px 12px;
    }

    .file-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 48px;
    }
}
</style>
