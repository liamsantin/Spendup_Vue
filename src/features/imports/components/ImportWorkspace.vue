<script setup lang="ts">
/**
 * Écran d’un import ouvert : le panneau suit le statut.
 * `erreur` → mapping · `aValider` → revue (ou remapping) · `valide` / `annule` → résultat.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { BanIcon, TemplateIcon, TrashIcon } from 'vue-tabler-icons';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { usePaymentMethodsStore } from '@/features/payment-methods/stores/payment-methods-store';
import { formatOperationDate } from '@/features/transactions/format';
import ImportStatusChip from '@/features/imports/components/list/ImportStatusChip.vue';
import ImportTemplateFormModal from '@/features/imports/components/modals/ImportTemplateFormModal.vue';
import ImportMappingPanel from '@/features/imports/components/workspace/ImportMappingPanel.vue';
import ImportResultPanel from '@/features/imports/components/workspace/ImportResultPanel.vue';
import ImportReviewPanel from '@/features/imports/components/workspace/ImportReviewPanel.vue';
import { canCancelImport, canReviewImport, formatImportTimestamp, importTemplateLabel, isImportOpen } from '@/features/imports/format';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import type { Import, ImportCommitSummary } from '@/features/imports/types';

const props = defineProps<{
    item: Import;
}>();

const emit = defineEmits<{
    deleted: [];
    /** `board` : la revue remplit la page (plateau AppBoard) ; `scroll` : contenu long qui défile. */
    layout: [value: 'board' | 'scroll'];
}>();

const { t, locale } = useI18n();
const store = useImportsStore();
const paymentMethodsStore = usePaymentMethodsStore();

const remapping = ref(false);
const justCommitted = ref<ImportCommitSummary | null>(null);
const cancelOpen = ref(false);
const deleteOpen = ref(false);
const templateOpen = ref(false);
const notice = ref<string | null>(null);
const localError = ref<string | null>(null);

watch(
    () => [props.item.publicId, props.item.status] as const,
    ([id, status], previous) => {
        if (!previous || previous[0] !== id || !canReviewImport({ status })) remapping.value = false;
        if (previous && previous[0] !== id) justCommitted.value = null;
    }
);

const panel = computed<'mapping' | 'review' | 'result'>(() => {
    if (props.item.status === 'erreur') return 'mapping';
    if (props.item.status === 'aValider') return remapping.value ? 'mapping' : 'review';
    return 'result';
});

watch(panel, (value) => emit('layout', value === 'review' ? 'board' : 'scroll'), { immediate: true });

// Libellés des moyens de paiement affichés sur les lignes.
watch(
    () => props.item.accountPublicId,
    (accountPublicId) => {
        if (accountPublicId) void paymentMethodsStore.loadList({ accountPublicId }).catch(() => undefined);
    },
    { immediate: true }
);

const meta = computed(() => {
    const parts: string[] = [props.item.accountName ?? t('importsPage.list.deletedAccount')];
    const { periodFrom, periodTo } = props.item;
    if (periodFrom && periodTo) {
        parts.push(
            t('importsPage.list.period', {
                from: formatOperationDate(periodFrom, locale.value),
                to: formatOperationDate(periodTo, locale.value)
            })
        );
    }
    const template = importTemplateLabel(props.item.templatePublicId, store.templates);
    if (template) parts.push(t('importsPage.detail.template', { name: template }));
    if (isImportOpen(props.item) && props.item.expiresAt) {
        parts.push(t('importsPage.list.expires', { date: formatImportTimestamp(props.item.expiresAt, locale.value) }));
    }
    return parts.join(' · ');
});

const templateDefaultName = computed(() => {
    const base = props.item.fileName.replace(/\.(csv|xlsx)$/i, '');
    return props.item.accountName ? `${props.item.accountName} · ${base}` : base;
});

void store.loadTemplates().catch(() => undefined);

async function confirmCancel() {
    localError.value = null;
    try {
        await store.cancelImport(props.item.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        cancelOpen.value = false;
    }
}

async function confirmDelete() {
    localError.value = null;
    try {
        await store.deleteImport(props.item.publicId);
        deleteOpen.value = false;
        emit('deleted');
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        deleteOpen.value = false;
    }
}

function onCommitted(summary: ImportCommitSummary) {
    justCommitted.value = summary;
}
</script>

<template>
    <div class="import-workspace">
        <div class="import-workspace__head">
            <div class="import-workspace__meta">
                <ImportStatusChip :status="item.status" kind="import" />
                <span class="import-workspace__meta-text">{{ meta }}</span>
            </div>
            <div v-if="isImportOpen(item)" class="import-workspace__actions">
                <button
                    v-if="item.status === 'aValider'"
                    type="button"
                    class="su-btn su-btn--ghost"
                    :disabled="store.acting"
                    @click="templateOpen = true"
                >
                    <TemplateIcon :size="16" stroke-width="1.6" />
                    <span class="import-workspace__label">{{ t('importsPage.actions.saveAsTemplate') }}</span>
                </button>
                <button
                    v-if="canCancelImport(item)"
                    type="button"
                    class="su-btn su-btn--ghost"
                    :disabled="store.acting"
                    @click="cancelOpen = true"
                >
                    <BanIcon :size="16" stroke-width="1.6" />
                    <span class="import-workspace__label">{{ t('importsPage.actions.cancel') }}</span>
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="store.acting"
                    :aria-label="t('importsPage.actions.delete')"
                    @click="deleteOpen = true"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </div>
        </div>

        <AppAlert v-if="localError" type="error" class="import-workspace__banner" closable @dismiss="localError = null">{{
            localError
        }}</AppAlert>
        <AppAlert v-if="notice" type="success" class="import-workspace__banner" closable @dismiss="notice = null">{{ notice }}</AppAlert>

        <ImportMappingPanel
            v-if="panel === 'mapping'"
            :key="`mapping-${item.publicId}`"
            :item="item"
            :cancellable="item.status === 'aValider'"
            @close="remapping = false"
            @done="remapping = false"
        />
        <ImportReviewPanel
            v-else-if="panel === 'review'"
            :key="`review-${item.publicId}`"
            :item="item"
            @remap="remapping = true"
            @committed="onCommitted"
        />
        <ImportResultPanel v-else :item="item" :summary="justCommitted" @deleted="emit('deleted')" />

        <AppConfirmationModal
            v-model="cancelOpen"
            :title="t('importsPage.cancelModal.title')"
            :message="t('importsPage.cancelModal.body')"
            :confirm-label="t('importsPage.actions.cancel')"
            confirm-color="warning"
            :loading="store.acting"
            @confirm="confirmCancel"
        />
        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('importsPage.deleteModal.title')"
            :message="t('importsPage.deleteModal.body')"
            :confirm-label="t('importsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
        <ImportTemplateFormModal
            v-model="templateOpen"
            :import-public-id="item.publicId"
            :default-name="templateDefaultName"
            @saved="notice = t('importsPage.result.templateSaved')"
        />
    </div>
</template>

<style scoped>
.import-workspace {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.import-workspace__head {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    margin-bottom: 10px;
}

.import-workspace__meta {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.import-workspace__meta-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.84rem;
    color: var(--ink-muted);
}

.import-workspace__actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.import-workspace__banner {
    flex: none;
    margin-bottom: 10px;
}

@media (max-width: 767px) {
    .import-workspace__meta {
        flex-wrap: wrap;
    }

    .import-workspace__meta-text {
        white-space: normal;
    }

    .import-workspace__label {
        display: none;
    }
}
</style>
