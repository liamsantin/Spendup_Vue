<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowDownLeftIcon, ArrowUpRightIcon, ArrowsExchangeIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { useAuthStore } from '@/features/auth';
import { UserPhotoAvatar } from '@/features/friends';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import {
    formatOperationDate,
    movementForAccount,
    resolveTransactionAmountDisplay,
    signedAmountForSens,
    sourceAccountPublicId,
    targetAccountPublicId
} from '@/features/transactions/format';
import type { Transaction, TransactionType } from '@/features/transactions/types';

const props = defineProps<{
    transaction: Transaction;
    canWrite: boolean;
    acting?: boolean;
    /** Relevés : afficher le sens du mouvement de ce compte (pas `movements[0]`). */
    statementAccountPublicId?: string | null;
}>();

const emit = defineEmits<{
    edit: [transaction: Transaction];
    delete: [transaction: Transaction];
}>();

const { t, locale } = useI18n();
const auth = useAuthStore();
const accountsStore = useAccountsStore();

const typeIcon = computed(() => {
    const map: Record<TransactionType, typeof ArrowDownLeftIcon> = {
        depense: ArrowDownLeftIcon,
        revenu: ArrowUpRightIcon,
        transfert: ArrowsExchangeIcon
    };
    return map[props.transaction.type];
});

const typeColor = computed(() => {
    if (props.transaction.type === 'depense') return 'error';
    if (props.transaction.type === 'revenu') return 'success';
    return 'primary';
});

const statementMovement = computed(() =>
    props.statementAccountPublicId ? movementForAccount(props.transaction, props.statementAccountPublicId) : undefined
);

const amountDisplay = computed(() => {
    const currency = props.transaction.currency;
    if (props.statementAccountPublicId && statementMovement.value) {
        const signed = signedAmountForSens(statementMovement.value.amount, statementMovement.value.sens);
        return resolveTransactionAmountDisplay(signed, currency, locale.value);
    }
    return resolveTransactionAmountDisplay(props.transaction.amount, currency, locale.value);
});

const amountTone = computed(() => {
    if (amountDisplay.value.hidden) return '';
    if (props.statementAccountPublicId && statementMovement.value) {
        return statementMovement.value.sens === 'debit' ? 'is-debit' : 'is-credit';
    }
    if (props.transaction.type === 'depense') return 'is-debit';
    if (props.transaction.type === 'revenu') return 'is-credit';
    return '';
});

function accountName(publicId: string | null): string {
    if (!publicId) return t('transactionsPage.unknownAccount');
    return accountsStore.accounts.find((a) => a.publicId === publicId)?.name ?? t('transactionsPage.unknownAccount');
}

const accountLine = computed(() => {
    if (props.transaction.type === 'transfert') {
        return t('transactionsPage.list.transferLine', {
            from: accountName(sourceAccountPublicId(props.transaction)),
            to: accountName(targetAccountPublicId(props.transaction))
        });
    }
    const id = sourceAccountPublicId(props.transaction);
    return accountName(id);
});

const authorLabel = computed(() => {
    const mine = auth.user?.userPublicId;
    if (mine && props.transaction.createdByUserPublicId === mine) {
        return t('transactionsPage.list.createdByMe');
    }
    const name = props.transaction.createdByDisplayName?.trim();
    return name ? t('transactionsPage.list.createdBy', { name }) : t('transactionsPage.list.createdByUnknown');
});

function onDoubleClick(event: MouseEvent) {
    if (!props.canWrite || props.acting) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('edit', props.transaction);
}
</script>

<template>
    <div
        class="su-person transaction-list-item"
        :class="{ 'transaction-list-item--editable': canWrite && !acting }"
        :data-transaction-id="transaction.publicId"
        @dblclick="onDoubleClick"
    >
        <span class="su-person__avatar su-person__avatar--tile" :class="`transaction-list-item__icon--${typeColor}`">
            <component :is="typeIcon" size="22" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">{{ transaction.label }}</p>
            <p class="su-person__sub">
                {{ t(`transactionsPage.types.${transaction.type}`) }}
                · {{ accountLine }}
            </p>
            <p class="su-person__sub d-flex align-center ga-2 min-width-0">
                <UserPhotoAvatar
                    :photo-url="transaction.createdByPhotoUrl"
                    :user-public-id="transaction.createdByUserPublicId"
                    :fallback-label="transaction.createdByDisplayName ?? undefined"
                    :size="18"
                />
                <span class="text-truncate">{{ authorLabel }}</span>
                <span>· {{ formatOperationDate(transaction.operationDate, locale) }}</span>
            </p>
        </div>
        <div class="su-person__actions">
            <span class="transaction-list-item__amount" :class="amountTone">{{ amountDisplay.text }}</span>
            <template v-if="canWrite">
                <button
                    type="button"
                    class="su-orb"
                    :disabled="acting"
                    :aria-label="t('transactionsPage.actions.edit')"
                    @click.stop="emit('edit', transaction)"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                </button>
                <button
                    type="button"
                    class="su-orb su-orb--danger"
                    :disabled="acting"
                    :aria-label="t('transactionsPage.actions.delete')"
                    @click.stop="emit('delete', transaction)"
                >
                    <TrashIcon :size="16" stroke-width="1.6" />
                </button>
            </template>
        </div>
    </div>
</template>

<style scoped>
.transaction-list-item {
    cursor: default;
}

.transaction-list-item--editable {
    cursor: pointer;
}

.transaction-list-item__icon--error {
    color: rgb(var(--v-theme-error));
}

.transaction-list-item__icon--success {
    color: rgb(var(--v-theme-success));
}

.transaction-list-item__icon--primary {
    color: rgb(var(--v-theme-primary));
}

.transaction-list-item__amount {
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
}

.transaction-list-item__amount.is-debit {
    color: rgb(var(--v-theme-error));
}

.transaction-list-item__amount.is-credit {
    color: rgb(var(--v-theme-success));
}
</style>
