<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { DownloadIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { downloadFileBlob, useFileContentUrl } from '@/features/files/composables/useFileContentUrl';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    modelValue: boolean;
    publicId?: string | null;
    nameOriginal?: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { objectUrl, loading, error, load, reset } = useFileContentUrl();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const title = computed(() => props.nameOriginal || t('filesPage.preview.title'));

watch(
    () => [props.modelValue, props.publicId] as const,
    ([isOpen, publicId]) => {
        if (!isOpen || !publicId) {
            reset();
            return;
        }
        void load(publicId);
    },
    { immediate: true }
);

async function onDownload() {
    if (!props.publicId) return;
    try {
        await downloadFileBlob(props.publicId, props.nameOriginal || 'document.pdf');
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase v-model="open" :title="title" :max-width="960" :height="820" fixed-height scrollable mobile-layout="fullscreen">
        <AppAlert v-if="error" type="error" class="mb-4" closable @dismiss="error = null">
            {{ error }}
        </AppAlert>

        <div v-if="loading" class="file-preview__loading">
            <span class="su-spin" />
        </div>
        <iframe v-else-if="objectUrl" class="file-preview__frame" :src="objectUrl" :title="title" />
        <p v-else class="file-preview__empty">{{ t('filesPage.preview.unavailable') }}</p>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" @click="close">
                {{ t('common.close') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!publicId || loading" @click="onDownload">
                <DownloadIcon :size="16" stroke-width="1.6" />
                {{ t('filesPage.actions.download') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.file-preview__loading,
.file-preview__empty {
    display: grid;
    place-items: center;
    min-height: 420px;
    color: var(--ink-muted);
}

.file-preview__frame {
    display: block;
    width: 100%;
    height: min(68vh, 640px);
    border: 0;
    border-radius: 12px;
    background: var(--surface-raised);
}
</style>
