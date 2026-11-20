import { CircleBottomDownIcon } from '@solar-icons/vue/line-duotone/circle-bottom-down';
import { CircleBottomUpIcon } from '@solar-icons/vue/line-duotone/circle-bottom-up';
import { RoundTransferHorizontalIcon } from '@solar-icons/vue/line-duotone/round-transfer-horizontal';
import type { TransactionType } from '@/features/transactions/types';

export const TRANSACTION_TYPE_ICONS = {
    depense: CircleBottomDownIcon,
    revenu: CircleBottomUpIcon,
    transfert: RoundTransferHorizontalIcon
} as const satisfies Record<TransactionType, typeof CircleBottomDownIcon>;

/** Teinte du carré d'icône selon le type : revenu et virement en bleu, dépense neutre (sauf couleur de catégorie). */
export function transactionTypeTint(type: TransactionType): 'blue' | 'gray' {
    return type === 'depense' ? 'gray' : 'blue';
}
