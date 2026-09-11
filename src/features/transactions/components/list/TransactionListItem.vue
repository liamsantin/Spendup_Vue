<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowDownLeftIcon, ArrowUpRightIcon, ArrowsExchangeIcon, PaperclipIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { useAuthStore } from '@/features/auth';
import { UserPhotoAvatar } from '@/features/friends';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import {
    formatOperationDate,
    formatSignedAmountDelta,
    movementForAccount,
    recurrenceAmountVariance,
    resolveTransactionAmountDisplay,
    signedAmountForSens,
    sourceAccountPublicId,
    targetAccountPublicId
} from '@/features/transactions/format';
import { plannedAmountForRecurrenceTransaction } from '@/features/transactions/recurrence-planned';
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
const categoriesStore = useCategoriesStore();
const tiersStore = useTiersStore();

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

const amountVariance = computed(() => {
    if (amountDisplay.value.hidden) return null;
    return recurrenceAmountVariance(
        props.transaction.amount,
        plannedAmountForRecurrenceTransaction(props.transaction),
        props.transaction.type
    );
});

const plannedAmountLabel = computed(() => {
    const variance = amountVariance.value;
    if (!variance) return '';
    return resolveTransactionAmountDisplay(variance.planned, props.transaction.currency, locale.value).text;
});

const deltaAmountLabel = computed(() => {
    const variance = amountVariance.value;
    if (!variance) return '';
    return formatSignedAmountDelta(variance.delta, props.transaction.currency, locale.value);
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

const categoryLabel = computed(() => {
    const id = props.transaction.categoryPublicId;
    if (!id) return null;
    return categoriesStore.findByPublicId(id)?.name ?? null;
});

/** Contrepartie personnelle : `null` sur un compte partagé ≠ « sans contrepartie », juste « aucune à moi ». */
const tierLabel = computed(() => {
    const id = props.transaction.tierPublicId;
    if (!id) return null;
    return tiersStore.findByPublicId(id)?.name ?? null;
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
        <span
            class="su-person__avatar su-person__avatar--tile transaction-list-item__icon"
            :class="`transaction-list-item__icon--${typeColor}`"
        >
            <component :is="typeIcon" size="20" stroke-width="2.4" />
        </span>
        <div class="su-person__meta">
            <p class="su-person__name">
                {{ transaction.label }}
                <span
                    v-if="transaction.files?.length"
                    class="transaction-list-item__clip"
                    :title="t('transactionsPage.list.hasAttachments', { count: transaction.files.length }, transaction.files.length)"
                >
                    <PaperclipIcon :size="14" stroke-width="1.8" />
                    {{ transaction.files.length }}
                </span>
            </p>
            <p class="su-person__sub">
                {{ t(`transactionsPage.types.${transaction.type}`) }}
                <template v-if="transaction.source === 'recurrence'"> · {{ t('transactionsPage.list.sourceRecurrence') }}</template>
                · {{ accountLine }}
                <template v-if="categoryLabel"> · {{ t('transactionsPage.list.myCategory', { name: categoryLabel }) }}</template>
                <template v-if="tierLabel">
                    ·
                    <span class="transaction-list-item__tier">{{ t('transactionsPage.list.myTier', { name: tierLabel }) }}</span>
                </template>
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
            <div class="transaction-list-item__amounts">
                <span class="transaction-list-item__amount" :class="amountTone">{{ amountDisplay.text }}</span>
                <span
                    v-if="amountVariance"
                    class="transaction-list-item__delta"
                    :class="`is-${amountVariance.tone}`"
                    :title="t('transactionsPage.list.recurrenceDelta', { delta: deltaAmountLabel, planned: plannedAmountLabel })"
                >
                    {{ deltaAmountLabel }}
                </span>
            </div>
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
    position: relative;
    z-index: 0;
    animation: none;
    transition:
        transform 0.5s var(--spring),
        box-shadow 0.45s var(--ease),
        background 0.3s var(--ease);
}

.transaction-list-item--editable {
    cursor: pointer;
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .transaction-list-item:hover {
        z-index: 1;
        transform: scale(1.012);
        box-shadow:
            0 1px 2px rgba(16, 16, 20, 0.04),
            0 12px 28px -16px rgba(16, 16, 20, 0.18);
    }
}

@media (prefers-reduced-motion: reduce) {
    .transaction-list-item {
        transition: none;
    }
}

.transaction-list-item__icon {
    box-shadow: none;
}

.transaction-list-item__icon--error {
    color: rgb(var(--v-theme-error));
    background: rgba(var(--v-theme-error), 0.12);
}

.transaction-list-item__icon--success {
    color: rgb(var(--v-theme-success));
    background: rgba(var(--v-theme-success), 0.12);
}

.transaction-list-item__icon--primary {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.12);
}

.transaction-list-item__amounts {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
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

.transaction-list-item__delta {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
}

.transaction-list-item__delta.is-unfavorable {
    color: rgb(var(--v-theme-error));
}

.transaction-list-item__delta.is-favorable {
    color: rgb(var(--v-theme-success));
}

.transaction-list-item__tier {
    display: inline-flex;
    align-items: center;
    padding: 0 7px;
    border-radius: 999px;
    background: rgba(var(--v-theme-primary), 0.09);
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
}

.transaction-list-item__clip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 8px;
    color: var(--ink-muted);
    font-size: 0.75rem;
    font-weight: 650;
    vertical-align: middle;
}
</style>
