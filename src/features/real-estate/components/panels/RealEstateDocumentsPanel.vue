<script setup lang="ts">
/** Onglet « Documents » : fichiers PDF typés ; « Délier » retire le document sans supprimer le fichier. */
defineOptions({ name: 'RealEstateDocumentsPanel' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FileTextIcon } from 'vue-tabler-icons';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import FilePreview from '@/features/files/components/FilePreview.vue';
import { fileSizeParts } from '@/features/files/format';
import { useRealEstatePanel } from '@/features/real-estate/composables/useRealEstatePanel';
import { formatCalendarDate, unitNameOf } from '@/features/real-estate/format';
import { useRealEstateStore } from '@/features/real-estate/stores/real-estate-store';
import type { RealEstateDocument } from '@/features/real-estate/types';
import RealEstateDocumentFormModal from '@/features/real-estate/components/modals/RealEstateDocumentFormModal.vue';
import RealEstatePanelFrame from '@/features/real-estate/components/panels/RealEstatePanelFrame.vue';
import RealEstateRowMenu from '@/features/real-estate/components/panels/RealEstateRowMenu.vue';

const props = defineProps<{
    assetPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useRealEstateStore();
const panel = useRealEstatePanel<RealEstateDocument>({
    notFoundKey: 'realEstatePage.errors.documentNotFound',
    remove: (doc) => store.deleteDocument(props.assetPublicId, doc.publicId),
    reload: () => store.loadDocuments(props.assetPublicId, true)
});
const { createOpen, editOpen, editTarget, deleteOpen, errorText } = panel;

const previewTarget = ref<RealEstateDocument | null>(null);
const previewOpen = computed({
    get: () => !!previewTarget.value,
    set: (value: boolean) => {
        if (!value) previewTarget.value = null;
    }
});

const items = computed(() => store.documentsFor(props.assetPublicId));
const units = computed(() => store.unitsFor(props.assetPublicId));
const loading = computed(() => store.loadingFor(props.assetPublicId, 'documents'));
const countLabel = computed(() =>
    items.value.length ? t('realEstatePage.documents.count', { count: items.value.length }, items.value.length) : null
);
const empty = t('common.emptyValue');

function sizeLabel(bytes: number) {
    const parts = fileSizeParts(bytes);
    return t(`filesPage.size.${parts.unit}`, { n: parts.n });
}

watch(
    () => props.assetPublicId,
    (id) => {
        if (id) void panel.load(() => store.loadDocuments(id));
    },
    { immediate: true }
);
</script>

<template>
    <RealEstatePanelFrame
        :count-label="countLabel"
        :add-label="t('realEstatePage.documents.add')"
        :loading="loading"
        :empty="!items.length"
        :empty-text="t('realEstatePage.documents.empty')"
        :error="errorText"
        :disabled="store.acting"
        @add="panel.openCreate"
        @dismiss="panel.dismissError"
    >
        <table class="su-table">
            <thead>
                <tr>
                    <th scope="col">{{ t('realEstatePage.documents.columns.name') }}</th>
                    <th scope="col">{{ t('realEstatePage.documents.columns.type') }}</th>
                    <th scope="col">{{ t('realEstatePage.documents.columns.date') }}</th>
                    <th scope="col">{{ t('realEstatePage.documents.columns.unit') }}</th>
                    <th scope="col" class="is-num">{{ t('realEstatePage.documents.columns.size') }}</th>
                    <th scope="col">
                        <span class="d-sr-only">{{ t('common.more') }}</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="doc in items" :key="doc.publicId">
                    <td class="is-wrap">
                        <button
                            type="button"
                            class="re-doc-open"
                            :aria-label="t('realEstatePage.documents.open', { name: doc.name })"
                            @click="previewTarget = doc"
                        >
                            <FileTextIcon :size="16" stroke-width="1.6" />
                            <span class="re-doc-open__name">{{ doc.name }}</span>
                        </button>
                        <span v-if="doc.name !== doc.file.nameOriginal" class="is-sub">{{ doc.file.nameOriginal }}</span>
                    </td>
                    <td>{{ t(`realEstatePage.documentTypes.${doc.documentType}`) }}</td>
                    <td>{{ doc.documentDate ? formatCalendarDate(doc.documentDate, locale) : empty }}</td>
                    <td>{{ unitNameOf(units, doc.unitPublicId) ?? t('realEstatePage.form.wholeProperty') }}</td>
                    <td class="is-num is-muted">{{ sizeLabel(doc.file.sizeBytes) }}</td>
                    <td class="is-actions">
                        <RealEstateRowMenu
                            :disabled="store.acting"
                            :delete-label="t('realEstatePage.documents.unlink')"
                            @edit="panel.openEdit(doc)"
                            @delete="panel.requestDelete(doc)"
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    </RealEstatePanelFrame>

    <RealEstateDocumentFormModal v-model="createOpen" :asset-public-id="assetPublicId" />
    <RealEstateDocumentFormModal v-model="editOpen" :asset-public-id="assetPublicId" :document="editTarget" />

    <AppModalBase
        v-model="previewOpen"
        :title="previewTarget?.name || t('filesPage.preview.title')"
        :max-width="920"
        :height="780"
        scrollable
        mobile-layout="fullscreen"
        :show-footer="false"
    >
        <div class="re-doc-preview">
            <FilePreview v-if="previewTarget" :public-id="previewTarget.file.publicId" :name-original="previewTarget.file.nameOriginal" />
        </div>
    </AppModalBase>

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('realEstatePage.documents.deleteTitle')"
        :message="t('realEstatePage.documents.deleteBody')"
        :confirm-label="t('realEstatePage.documents.unlink')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="panel.confirmDelete"
    />
</template>

<style scoped>
/* nom cliquable : ouvre l’aperçu du PDF */
.re-doc-open {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    max-width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.re-doc-open > svg {
    flex: none;
    color: var(--gray);
}

.re-doc-open__name {
    font-weight: 700;
}

.re-doc-open:hover .re-doc-open__name,
.re-doc-open:focus-visible .re-doc-open__name {
    color: var(--blue-ink);
    text-decoration: underline;
}

.re-doc-preview {
    display: flex;
    flex-direction: column;
    min-height: 62vh;
    height: 62vh;
}
</style>
