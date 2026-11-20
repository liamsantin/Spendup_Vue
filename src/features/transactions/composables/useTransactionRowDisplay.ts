import { computed, type Component, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/features/auth';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { resolveCategoryIcon } from '@/features/categories/icons';
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
import { TRANSACTION_TYPE_ICONS, transactionTypeTint } from '@/features/transactions/typeUi';
import type { Transaction } from '@/features/transactions/types';

/** Vrai signe moins (U+2212), jamais le trait d’union. */
export const MINUS_SIGN = '−';

/**
 * Montant signé d’une transaction pour l’affichage : revenu positif, dépense négative,
 * virement neutre (`null`) hors relevé ; sur un relevé de compte, le sens du mouvement fait foi.
 * `null` aussi quand le montant est masqué.
 */
export function signedTransactionAmount(transaction: Transaction, statementAccountPublicId?: string | null): number | null {
    if (statementAccountPublicId) {
        const movement = movementForAccount(transaction, statementAccountPublicId);
        if (movement) return signedAmountForSens(movement.amount, movement.sens);
    }
    const amount = transaction.amount;
    if (amount == null) return null;
    if (transaction.type === 'revenu') return Math.abs(amount);
    if (transaction.type === 'depense') return -Math.abs(amount);
    return null;
}

/** Préfixe de signe d’un montant signé : « + » bleu, « − » noir, rien pour zéro / neutre. */
export function amountSignOf(value: number | null | undefined): '+' | '−' | '' {
    if (value == null || value === 0) return '';
    return value > 0 ? '+' : MINUS_SIGN;
}

/** Libellés et montants d’une ligne de transaction (liste groupée par jour). */
export function useTransactionRowDisplay(transaction: Ref<Transaction>, statementAccountPublicId: Ref<string | null | undefined>) {
    const { t, locale } = useI18n();
    const auth = useAuthStore();
    const accountsStore = useAccountsStore();
    const categoriesStore = useCategoriesStore();
    const tiersStore = useTiersStore();

    const typeIcon = computed(() => TRANSACTION_TYPE_ICONS[transaction.value.type]);

    const category = computed(() => {
        const id = transaction.value.categoryPublicId;
        return id ? (categoriesStore.findByPublicId(id) ?? null) : null;
    });

    /** Pictogramme du carré : celui de la catégorie si elle en a un, sinon celui du type. */
    const tileIcon = computed<Component>(() => {
        const icon = category.value?.icone;
        return icon ? resolveCategoryIcon(icon) : typeIcon.value;
    });

    /** Teinte du carré : bleu pour revenu / virement, couleur de catégorie pour une dépense, gris sinon. */
    const tileTint = computed<'blue' | 'gray' | 'custom'>(() => {
        const base = transactionTypeTint(transaction.value.type);
        if (base === 'blue') return 'blue';
        return category.value?.color ? 'custom' : 'gray';
    });

    const tileStyle = computed(() => {
        if (tileTint.value !== 'custom' || !category.value?.color) return undefined;
        return { '--tile-color': category.value.color };
    });

    const categoryColor = computed(() => category.value?.color ?? null);

    const statementMovement = computed(() =>
        statementAccountPublicId.value ? movementForAccount(transaction.value, statementAccountPublicId.value) : undefined
    );

    const hidden = computed(() => {
        if (statementAccountPublicId.value && statementMovement.value) return statementMovement.value.amount == null;
        return transaction.value.amount == null;
    });

    const signedAmount = computed(() => signedTransactionAmount(transaction.value, statementAccountPublicId.value));

    /** Montant absolu formaté (le signe est porté par `amountSign`). */
    const amountDisplay = computed(() => {
        const currency = transaction.value.currency;
        if (hidden.value) return resolveTransactionAmountDisplay(null, currency, locale.value);
        const raw = signedAmount.value ?? transaction.value.amount ?? 0;
        return resolveTransactionAmountDisplay(Math.abs(raw), currency, locale.value);
    });

    const amountSign = computed(() => (hidden.value ? '' : amountSignOf(signedAmount.value)));

    const amountText = computed(() => `${amountSign.value}${amountDisplay.value.text}`);

    const amountTone = computed(() => {
        if (hidden.value) return '';
        if (statementAccountPublicId.value && statementMovement.value) {
            return statementMovement.value.sens === 'debit' ? 'is-debit' : 'is-credit';
        }
        if (transaction.value.type === 'depense') return 'is-debit';
        if (transaction.value.type === 'revenu') return 'is-credit';
        return '';
    });

    const amountVariance = computed(() => {
        if (hidden.value) return null;
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

    const isMine = computed(() => {
        const mine = auth.user?.userPublicId;
        return !!mine && transaction.value.createdByUserPublicId === mine;
    });

    const authorLabel = computed(() => {
        if (isMine.value) return t('transactionsPage.list.createdByMe');
        const name = transaction.value.createdByDisplayName?.trim();
        return name ? t('transactionsPage.list.createdBy', { name }) : t('transactionsPage.list.createdByUnknown');
    });

    const categoryLabel = computed(() => category.value?.name ?? null);

    /** Contrepartie personnelle : `null` sur un compte partagé ≠ « sans contrepartie », juste « aucune à moi ». */
    const tierLabel = computed(() => {
        const id = transaction.value.tierPublicId;
        if (!id) return null;
        return tiersStore.findByPublicId(id)?.name ?? null;
    });

    return {
        typeIcon,
        tileIcon,
        tileTint,
        tileStyle,
        categoryColor,
        amountDisplay,
        amountSign,
        amountText,
        amountTone,
        amountVariance,
        plannedAmountLabel,
        deltaAmountLabel,
        accountLine,
        isMine,
        authorLabel,
        categoryLabel,
        tierLabel
    };
}
