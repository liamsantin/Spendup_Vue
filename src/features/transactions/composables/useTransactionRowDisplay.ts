import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { useCategoriesStore } from '@/features/categories/stores/categories-store';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import {
    formatSignedAmountDelta,
    movementForAccount,
    recurrenceAmountVariance,
    resolveTransactionAmountDisplay,
    signedAmountForSens,
    sourceAccountPublicId,
    targetAccountPublicId
} from '@/features/transactions/format';
import { plannedAmountForRecurrenceTransaction } from '@/features/transactions/recurrence-planned';
import { TRANSACTION_TYPE_ICONS, transactionTypeColor } from '@/features/transactions/typeUi';
import type { Transaction } from '@/features/transactions/types';

/** Libellés et montants d’une ligne de transaction (carte mobile et ligne de tableau). */
export function useTransactionRowDisplay(transaction: Ref<Transaction>, statementAccountPublicId: Ref<string | null | undefined>) {
    const { t, locale } = useI18n();
    const auth = useAuthStore();
    const accountsStore = useAccountsStore();
    const categoriesStore = useCategoriesStore();
    const tiersStore = useTiersStore();

    const typeIcon = computed(() => TRANSACTION_TYPE_ICONS[transaction.value.type]);
    const typeColor = computed(() => transactionTypeColor(transaction.value.type));

    const statementMovement = computed(() =>
        statementAccountPublicId.value ? movementForAccount(transaction.value, statementAccountPublicId.value) : undefined
    );

    const amountDisplay = computed(() => {
        const currency = transaction.value.currency;
        if (statementAccountPublicId.value && statementMovement.value) {
            const signed = signedAmountForSens(statementMovement.value.amount, statementMovement.value.sens);
            return resolveTransactionAmountDisplay(signed, currency, locale.value);
        }
        return resolveTransactionAmountDisplay(transaction.value.amount, currency, locale.value);
    });

    const amountTone = computed(() => {
        if (amountDisplay.value.hidden) return '';
        if (statementAccountPublicId.value && statementMovement.value) {
            return statementMovement.value.sens === 'debit' ? 'is-debit' : 'is-credit';
        }
        if (transaction.value.type === 'depense') return 'is-debit';
        if (transaction.value.type === 'revenu') return 'is-credit';
        return '';
    });

    const amountVariance = computed(() => {
        if (amountDisplay.value.hidden) return null;
        return recurrenceAmountVariance(
            transaction.value.amount,
            plannedAmountForRecurrenceTransaction(transaction.value),
            transaction.value.type
        );
    });

    const plannedAmountLabel = computed(() => {
        const variance = amountVariance.value;
        if (!variance) return '';
        return resolveTransactionAmountDisplay(variance.planned, transaction.value.currency, locale.value).text;
    });

    const deltaAmountLabel = computed(() => {
        const variance = amountVariance.value;
        if (!variance) return '';
        return formatSignedAmountDelta(variance.delta, transaction.value.currency, locale.value);
    });

    function accountName(publicId: string | null): string {
        if (!publicId) return t('transactionsPage.unknownAccount');
        return accountsStore.accounts.find((a) => a.publicId === publicId)?.name ?? t('transactionsPage.unknownAccount');
    }

    const accountLine = computed(() => {
        if (transaction.value.type === 'transfert') {
            return t('transactionsPage.list.transferLine', {
                from: accountName(sourceAccountPublicId(transaction.value)),
                to: accountName(targetAccountPublicId(transaction.value))
            });
        }
        return accountName(sourceAccountPublicId(transaction.value));
    });

    const authorLabel = computed(() => {
        const mine = auth.user?.userPublicId;
        if (mine && transaction.value.createdByUserPublicId === mine) {
            return t('transactionsPage.list.createdByMe');
        }
        const name = transaction.value.createdByDisplayName?.trim();
        return name ? t('transactionsPage.list.createdBy', { name }) : t('transactionsPage.list.createdByUnknown');
    });

    const categoryLabel = computed(() => {
        const id = transaction.value.categoryPublicId;
        if (!id) return null;
        return categoriesStore.findByPublicId(id)?.name ?? null;
    });

    /** Contrepartie personnelle : `null` sur un compte partagé ≠ « sans contrepartie », juste « aucune à moi ». */
    const tierLabel = computed(() => {
        const id = transaction.value.tierPublicId;
        if (!id) return null;
        return tiersStore.findByPublicId(id)?.name ?? null;
    });

    return {
        typeIcon,
        typeColor,
        amountDisplay,
        amountTone,
        amountVariance,
        plannedAmountLabel,
        deltaAmountLabel,
        accountLine,
        authorLabel,
        categoryLabel,
        tierLabel
    };
}
