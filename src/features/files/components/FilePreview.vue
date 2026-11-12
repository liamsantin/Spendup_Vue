<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import PdfViewer from '@/features/files/components/PdfViewer.vue';
import { useFileContentUrl } from '@/features/files/composables/useFileContentUrl';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    publicId: string;
    nameOriginal?: string | null;
}>();

const { t } = useI18n();
const { objectUrl, blob, loading, error, load, reset } = useFileContentUrl();

const title = computed(() => props.nameOriginal || t('filesPage.preview.title'));
/** Jamais l’URL API : le JWT ne sort pas, pdf.js lit seulement le PDF déchiffré en mémoire. */

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
        <PdfViewer v-else-if="blob" :file="blob" :title="title" />
        <p v-else class="file-reader__state">{{ t('filesPage.preview.unavailable') }}</p>
    </div>
</template>

<style scoped>
/* lecteur plein écran : carré, un filet fin autour, ni arrondi ni ombre */
.file-reader {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    border-radius: 0;
    background: var(--bg);
    border: 1px solid var(--line);
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
    color: var(--gray);
}
</style>
