<script setup lang="ts">
/**
 * Onglet « Transactions » d’une fiche (récurrence, tiers, budget), même structure que celui d’un actif :
 * barre « Lier », « Délier », « Ajouter » en haut à droite, puis la liste filtrée sur l’élément.
 * - « Lier » : la fiche ouvre son sélecteur (`@link`) ;
 * - « Délier » : avec `unlinkFields`, retire le lien des lignes cochées après confirmation ; sinon la fiche
 *   ouvre son propre sélecteur (`@unlink`) ;
 * - « Ajouter » : crée une écriture préremplie avec les filtres de la fiche.
 */
defineOptions({ name: 'LinkedTransactionsPanel' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LinkIcon, PlusIcon, UnlinkIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import TransactionsTimeline, {
    type TransactionsCreateDefaults,
    type TransactionsLockedFilters
} from '@/features/transactions/components/TransactionsTimeline.vue';
import type { TransactionFormFields } from '@/features/transactions/payload';
import { canWriteTransaction } from '@/features/transactions/rights';
import { useTransactionsStore } from '@/features/transactions/stores/transactions-store';
import type { Transaction } from '@/features/transactions/types';

const props = withDefaults(
    defineProps<{
        lockedFilters: TransactionsLockedFilters;
        /** Valeurs préremplies du bouton « Ajouter ». */
        createDefaults?: TransactionsCreateDefaults | null;
        /** Champs de la transaction une fois déliée. Défini : on délie les lignes cochées dans la liste. */
        unlinkFields?: ((transaction: Transaction) => TransactionFormFields | null) | null;
        canLink?: boolean;
        canUnlink?: boolean;
        canCreate?: boolean;
    }>(),
    {
        createDefaults: null,
        unlinkFields: null,
        canLink: true,
        canUnlink: true,
        canCreate: true
    }
);

const emit = defineEmits<{
    link: [];
    unlink: [];
    changed: [];
}>();

const { t } = useI18n();
const accountsStore = useAccountsStore();
const transactionsStore = useTransactionsStore();

const timelineRef = ref<{ openCreate: () => void } | null>(null);
const selectedIds = ref<string[]>([]);
const confirmOpen = ref(false);
const unlinking = ref(false);
const localError = ref<string | null>(null);

const bySelection = computed(() => !!props.unlinkFields);
const selected = computed(() =>
    transactionsStore.items.filter(
        (item) => selectedIds.value.includes(item.publicId) && item.amount != null && canWriteTransaction(item, accountsStore.accounts)
    )
);
const unlinkDisabled = computed(() => !props.canUnlink || unlinking.value || (bySelection.value && !selected.value.length));

function onUnlink() {
    if (unlinkDisabled.value) return;
    if (bySelection.value) confirmOpen.value = true;
    else emit('unlink');
}

async function confirmUnlink() {
    const toFields = props.unlinkFields;
    if (!toFields || !selected.value.length) return;
    unlinking.value = true;
    localError.value = null;
    try {
        for (const item of selected.value) {
            const fields = toFields(item);
            if (!fields) continue;
            await transactionsStore.updateTransaction(item.publicId, fields);
        }
        selectedIds.value = [];
        confirmOpen.value = false;
        emit('changed');
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.status === 404 ? t('transactionsPage.errors.notFound') : getErrorMessage(e);
        confirmOpen.value = false;
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <div class="linked-transactions su-fill__grow">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>
        <div class="linked-transactions__bar">
            <button type="button" class="su-btn" :disabled="!canLink" @click="emit('link')">
                <LinkIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.linkTransactions.action') }}
            </button>
            <button type="button" class="su-btn" :disabled="unlinkDisabled" @click="onUnlink">
                <UnlinkIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.unlinkTransactions.action') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canCreate" @click="timelineRef?.openCreate()">
                <PlusIcon :size="16" stroke-width="1.6" />
                {{ t('transactionsPage.actions.create') }}
            </button>
        </div>
        <div class="su-fill__scroll">
            <TransactionsTimeline
                ref="timelineRef"
                v-model:selected-ids="selectedIds"
                :locked-filters="lockedFilters"
                :create-defaults="createDefaults"
                :selectable="bySelection"
            />
        </div>
        <AppConfirmationModal
            v-model="confirmOpen"
            :title="t('transactionsPage.unlinkModal.title', { count: selected.length }, selected.length)"
            :message="t('transactionsPage.unlinkModal.bodyGeneric', { count: selected.length }, selected.length)"
            :confirm-label="t('transactionsPage.unlinkTransactions.confirm', { count: selected.length }, selected.length)"
            :loading="unlinking"
            @confirm="confirmUnlink"
        />
    </div>
</template>

<style scoped>
.linked-transactions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

/* même barre que l’onglet Transactions d’un actif : boutons à droite, l’action principale en dernier */
.linked-transactions__bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}
</style>
