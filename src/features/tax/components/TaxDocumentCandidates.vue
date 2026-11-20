<script setup lang="ts">
/** Pièces déjà jointes à vos opérations de l'année (facture, attestation d'assurance) et utiles à cette étape : un geste pour les ranger. */
defineOptions({ name: 'TaxDocumentCandidates' });

import { useI18n } from 'vue-i18n';
import { displayFileName } from '@/features/files/file-name-display';
import type { TaxDocumentCandidate } from '@/features/tax/types';

defineProps<{
    items: TaxDocumentCandidate[];
    saving: boolean;
}>();

const emit = defineEmits<{
    file: [item: TaxDocumentCandidate];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="tax-form" data-test="tax-document-candidates">
        <h2 class="tax-form__legend">{{ t('taxPage.documentCandidates.title') }}</h2>
        <p class="tax-muted">{{ t('taxPage.documentCandidates.hint') }}</p>
        <article v-for="item in items" :key="item.filePublicId" class="tax-fiche">
            <p class="tax-fiche__title">{{ displayFileName(item.filePublicId, item.fileName, t('vault.unreadable')) }}</p>
            <p class="tax-muted">{{ t('taxPage.documentCandidates.from', { label: item.sourceLabel }) }}</p>
            <button type="button" class="su-btn su-btn--ink su-btn--sm" :disabled="saving" @click="emit('file', item)">
                {{ t('taxPage.documentCandidates.file') }}
            </button>
        </article>
    </section>
</template>
