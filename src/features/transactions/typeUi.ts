import { CircleBottomDownIcon } from '@solar-icons/vue/line-duotone/circle-bottom-down';
import { CircleBottomUpIcon } from '@solar-icons/vue/line-duotone/circle-bottom-up';
import { RoundTransferHorizontalIcon } from '@solar-icons/vue/line-duotone/round-transfer-horizontal';
import type { TransactionType } from '@/features/transactions/types';

export const TRANSACTION_TYPE_ICONS = {
    depense: CircleBottomDownIcon,
    revenu: CircleBottomUpIcon,
    transfert: RoundTransferHorizontalIcon
} as const satisfies Record<TransactionType, typeof CircleBottomDownIcon>;

export function transactionTypeColor(type: TransactionType): 'error' | 'success' | 'primary' {
    if (type === 'depense') return 'error';
    if (type === 'revenu') return 'success';
    return 'primary';
}
