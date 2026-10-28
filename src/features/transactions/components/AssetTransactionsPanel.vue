<script setup lang="ts">
/**
 * Transactions liées à un actif : `GET /api/transactions?assetPublicId=`.
 * « Lier » ouvre le sélecteur. « Délier » confirme le retrait des lignes cochées.
 * « Ajouter » crée une écriture déjà liée.
 */
defineOptions({ name: 'AssetTransactionsPanel' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LinkIcon, PlusIcon, UnlinkIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { ASSET_NOT_FOUND_MESSAGE } from '@/features/assets/types';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import AssetLinkTransactionsModal from '@/features/transactions/components/modals/AssetLinkTransactionsModal.vue';
import TransactionsTimeline from '@/features/transactions/components/TransactionsTimeline.vue';
import { isTransactionUnlinkableFromAsset, transactionFormFieldsWithAsset } from '@/features/transactions/link-asset';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';

const props = defineProps<{
    assetPublicId: string;
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();
const timelineRef = ref<{ openCreate: () => void } | null>(null);
const linkOpen = ref(false);
const confirmOpen = ref(false);
const unlinking = ref(false);
const localError = ref<string | null>(null);
const selectedIds = ref<string[]>([]);

const selected = computed(() =>
    transactionsStore.items.filter(
        (item) =>
            selectedIds.value.includes(item.publicId) && isTransactionUnlinkableFromAsset(item, props.assetPublicId, accountsStore.accounts)
    )
);

function openCreate() {
    timelineRef.value?.openCreate();
}

function askUnlink() {
    if (!selected.value.length || unlinking.value) return;
    confirmOpen.value = true;
}

async function confirmUnlink() {
    if (!selected.value.length) return;
    unlinking.value = true;
    localError.value = null;
    try {
        for (const item of selected.value) {
            const fields = transactionFormFieldsWithAsset(item, '');
            if (!fields) continue;
            await transactionsStore.updateTransaction(item.publicId, fields);
        }
        selectedIds.value = [];
        confirmOpen.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.message === ASSET_NOT_FOUND_MESSAGE) localError.value = t('assetsPage.errors.notFound');
        else localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        confirmOpen.value = false;
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <div class="asset-transactions">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>
        <div class="asset-transactions__bar">
            <button type="button" class="su-btn" @click="linkOpen = true">
                <LinkIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.linkTransactions.action') }}
            </button>
            <button type="button" class="su-btn" :disabled="!selected.length || unlinking" @click="askUnlink">
                <UnlinkIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.unlinkTransactions.action') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" @click="openCreate">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.create') }}
            </button>
        </div>
        <TransactionsTimeline ref="timelineRef" v-model:selected-ids="selectedIds" :locked-asset-public-id="assetPublicId" />
        <AssetLinkTransactionsModal v-model="linkOpen" :asset-public-id="assetPublicId" />
        <AppConfirmationModal
            v-model="confirmOpen"
            :title="t('transactionsPage.unlinkModal.title', { count: selected.length }, selected.length)"
            :message="t('transactionsPage.unlinkModal.body', { count: selected.length }, selected.length)"
            :confirm-label="t('transactionsPage.unlinkTransactions.confirm', { count: selected.length }, selected.length)"
            :loading="unlinking"
            @confirm="confirmUnlink"
        />
    </div>
</template>

<style scoped>
.asset-transactions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

.asset-transactions__bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}
</style>
