<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { useFileContentUrl } from '@/features/files/composables/useFileContentUrl';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    publicId: string;
    nameOriginal?: string | null;
}>();

const { t } = useI18n();
const { objectUrl, loading, error, load, reset } = useFileContentUrl();

const title = computed(() => props.nameOriginal || t('filesPage.preview.title'));
const frameSrc = computed(() => (objectUrl.value ? `${objectUrl.value}#view=FitH` : undefined));

watch(
    () => props.publicId,
    (publicId) => {
        if (!publicId) {
            reset();
            return;
        }
        void load(publicId);
    },
    { immediate: true }
);

async function download() {
    if (!objectUrl.value) return;
    try {
        const link = document.createElement('a');
        link.href = objectUrl.value;
        link.download = props.nameOriginal || 'document.pdf';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    }
}

defineExpose({ download });
</script>

<template>
    <div class="file-reader">
        <AppAlert v-if="error" type="error" class="file-reader__alert" closable @dismiss="error = null">
            {{ error }}
        </AppAlert>

        <div v-if="loading" class="file-reader__state">
            <span class="su-spin" />
        </div>
        <iframe v-else-if="frameSrc" class="file-reader__frame" :src="frameSrc" :title="title" />
        <p v-else class="file-reader__state">{{ t('filesPage.preview.unavailable') }}</p>
    </div>
</template>

<style scoped>
.file-reader {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    border-radius: var(--radius-surface);
    background: var(--surface);
    border: 1px solid var(--stroke);
    overflow: hidden;
}

.file-reader__alert {
    margin: 12px 12px 0;
}

.file-reader__state {
    display: grid;
    place-items: center;
    flex: 1;
    min-height: 240px;
    margin: 0;
    color: var(--ink-muted);
}

.file-reader__frame {
    display: block;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    height: 100%;
    border: 0;
    background: #525659;
}
</style>
