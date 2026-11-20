<script setup lang="ts">
/**
 * Justificatifs d’un actif, en deux blocs :
 * - Sur l’actif : PDF liés directement (`/api/assets/{id}/files`), bouton « Ajouter » en haut à droite ;
 * - Sur les transactions : PDF des transactions liées à l’actif (`GET /api/transactions?assetPublicId=`), groupés par transaction.
 */
defineOptions({ name: 'AssetAttachmentsPanel' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { assetsApi } from '@/features/assets/api';
import type { AttachmentSource } from '@/features/attachments/api';
import EntityAttachmentsPanel from '@/features/attachments/components/EntityAttachmentsPanel.vue';
import { groupTransactionsWithFiles, listAllTransactionsMatching } from '@/features/recurring-payments/linked-transaction-files';
import LinkedTransactionFiles from '@/features/transactions/components/LinkedTransactionFiles.vue';
import TransactionFormModal from '@/features/transactions/components/modals/TransactionFormModal.vue';
import { transactionsApi } from '@/features/transactions/api';
import type { Transaction } from '@/features/transactions/types';

const props = defineProps<{
    assetPublicId: string;
}>();

/** Plafond de l’API (`AttachmentParent.MaxFilesPerAsset`). */
const ASSET_FILES_MAX = 50;

const { t } = useI18n();

const transactions = ref<Transaction[]>([]);
const loadingTx = ref(false);
const localError = ref<string | null>(null);
const txTarget = ref<Transaction | null>(null);
/** Numéro du chargement en cours : un chargement dépassé (autre actif) n’écrase pas la liste. */
let loadId = 0;

const source = computed<AttachmentSource>(() => {
    const id = props.assetPublicId;
    return {
        key: `asset:${id}`,
        max: ASSET_FILES_MAX,
        list: () => assetsApi.listFiles(id),
        attach: (filePublicId) => assetsApi.attachFile(id, filePublicId),
        detach: (filePublicId) => assetsApi.detachFile(id, filePublicId)
    };
});

const groups = computed(() => groupTransactionsWithFiles(transactions.value));

const txOpen = computed({
    get: () => !!txTarget.value,
    set: (value: boolean) => {
        if (!value) txTarget.value = null;
    }
});

async function loadTransactions() {
    const id = ++loadId;
    const assetPublicId = props.assetPublicId.trim();
    if (!assetPublicId) return;
    loadingTx.value = true;
    localError.value = null;
    try {
        const items = await listAllTransactionsMatching({
            filter: { assetPublicId },
            list: (query) => transactionsApi.list(query),
            get: (publicId) => transactionsApi.get(publicId)
        });
        if (id === loadId) transactions.value = items;
    } catch (e: unknown) {
        if (id === loadId) localError.value = getErrorMessage(e);
    } finally {
        if (id === loadId) loadingTx.value = false;
    }
}

watch(() => props.assetPublicId, loadTransactions, { immediate: true });
</script>

<template>
    <EntityAttachmentsPanel :source="source" :title="t('assetsPage.detail.attachments.onAsset')">
        <template #default="{ openFile }">
            <section class="entity-attachments__block">
                <h2 class="entity-attachments__title">{{ t('assetsPage.detail.attachments.onTransactions') }}</h2>
                <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
                    {{ localError }}
                </AppAlert>
                <LinkedTransactionFiles
                    :groups="groups"
                    :loading="loadingTx"
                    :empty-text="t('assetsPage.detail.attachments.empty')"
                    @open-transaction="txTarget = $event"
                    @open-file="openFile"
                />
            </section>
            <TransactionFormModal v-model="txOpen" :transaction="txTarget" @saved="loadTransactions" />
        </template>
    </EntityAttachmentsPanel>
</template>
