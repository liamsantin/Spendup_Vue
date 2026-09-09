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

const dateLabel = computed(() => {
    if (props.file.documentDate) return formatDocumentDate(props.file.documentDate, locale.value);
    return formatInstant(props.file.createdAt, locale.value);
});

const subLine = computed(() => {
    const bits = [sizeLabel.value];
    if (props.file.documentDate) bits.push(dateLabel.value);
    else bits.push(t('filesPage.list.addedOn', { date: dateLabel.value }));
    return bits.join(' · ');
});

function onActivate(event: MouseEvent) {
    if (props.acting) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    emit('preview', props.file);
}
</script>

<template>
    <div class="file-row" :class="{ 'file-row--editable': !acting }" :data-file-id="file.publicId" @click="onActivate">
        <span class="file-row__icon">
            <PdfIcon size="18" stroke-width="1.8" />
        </span>

        <div class="file-row__meta">
            <p class="file-row__name">{{ file.nameOriginal }}</p>
            <p class="file-row__sub">{{ subLine }}</p>
            <p v-if="file.description" class="file-row__desc">{{ file.description }}</p>
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
.file-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 10px 10px;
    box-sizing: border-box;
    border-radius: 12px;
    color: inherit;
    position: relative;
    z-index: 0;
    transition:
        transform 0.5s var(--spring),
        box-shadow 0.45s var(--ease),
        background 0.3s var(--ease);
}

.file-row--editable {
    cursor: pointer;
}

.file-row:hover {
    background: var(--surface-hover-soft);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .file-row:hover {
        z-index: 1;
        transform: scale(1.012);
        box-shadow:
            0 1px 2px rgba(16, 16, 20, 0.04),
            0 12px 28px -16px rgba(16, 16, 20, 0.18);
    }
}

@media (prefers-reduced-motion: reduce) {
    .file-row {
        transition: none;
    }
}

.file-row__icon {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    margin-top: 1px;
    border-radius: 12px;
    background: rgba(var(--v-theme-error), 0.1);
    color: rgb(var(--v-theme-error));
}

.file-row__meta {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.file-row__name {
    margin: 0;
    min-width: 0;
    font-size: 14.5px;
    font-weight: 620;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-row__sub,
.file-row__desc {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-row__actions {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 2px;
    margin: -2px;
}

@media (max-width: 600px) {
    .file-row {
        flex-wrap: wrap;
        gap: 8px;
    }

    .file-row__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 46px;
    }
}
</style>
