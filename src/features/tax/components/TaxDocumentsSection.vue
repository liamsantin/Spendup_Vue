<script setup lang="ts">
/** Justificatifs de l'étape ouverte : liste, rattachement à une ligne, envoi ou choix dans la bibliothèque. */
defineOptions({ name: 'TaxDocumentsSection' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import type { FileDto } from '@/features/files/types';
import type { TaxDocumentLink, TaxLine } from '@/features/tax/types';
import AttachmentActions from '@/features/transactions/components/forms/AttachmentActions.vue';

const attachLine = defineModel<string>('attachLine', { required: true });

const props = defineProps<{
    documents: TaxDocumentLink[];
    /** Lignes de l'étape : cibles possibles d'un rattachement. */
    lines: TaxLine[];
    /** Étape « Identité » : pas de choix de ligne. */
    showLinePicker: boolean;
    /** Étapes où un relevé fiscal eCH-0196 peut être importé. */
    showStatement: boolean;
    /** Tous les fichiers déjà rangés sur la déclaration. */
    attached: { publicId: string }[];
    library: FileDto[];
    uploading: boolean;
    saving: boolean;
}>();

const emit = defineEmits<{
    detach: [documentPublicId: string];
    upload: [file: File];
    pickMany: [files: FileDto[]];
    statement: [event: Event];
}>();

const { t } = useI18n();

const lineItems = computed(() => props.lines.map((line) => ({ title: line.label, value: line.code })));
</script>

<template>
    <section class="tax-form">
        <h2 class="tax-form__legend">{{ t('taxPage.documentsTitle') }}</h2>
        <article v-for="doc in documents" :key="doc.publicId" class="tax-fiche">
            <p class="tax-fiche__title">{{ doc.fileName }}</p>
            <button type="button" class="su-btn" :disabled="saving" @click="emit('detach', doc.publicId)">
                {{ t('taxPage.fiches.remove') }}
            </button>
        </article>
        <div v-if="showLinePicker" class="tax-form__row">
            <label class="tax-form__label">{{ t('taxPage.attachLine') }}</label>
            <div class="tax-form__field">
                <AppSelect v-model="attachLine" :items="lineItems" :label="t('taxPage.line')" hide-details="auto" />
            </div>
        </div>
        <div class="tax-form__actions">
            <AttachmentActions
                split
                :attached="attached"
                :library="library"
                :uploading="uploading"
                :acting="saving"
                :max="50"
                :upload-label="t('taxPage.attachUpload')"
                :select-label="t('taxPage.attachSelect')"
                @upload="emit('upload', $event)"
                @pick-many="emit('pickMany', $event)"
            />
            <label v-if="showStatement" class="su-btn">
                {{ t('taxPage.importStatement') }}
                <input class="tax-file" type="file" accept=".xml,text/xml" @change="emit('statement', $event)" />
            </label>
        </div>
    </section>
</template>
