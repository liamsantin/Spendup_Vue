import type { Component } from 'vue';
import {
    ArrowBackUpIcon,
    BriefcaseIcon,
    BuildingBankIcon,
    CarIcon,
    CashIcon,
    ChartLineIcon,
    CreditCardIcon,
    DeviceLaptopIcon,
    GiftIcon,
    HomeIcon,
    PercentageIcon,
    PlugIcon,
    ReceiptIcon,
    ReceiptTaxIcon,
    RepeatIcon,
    ShieldIcon,
    ToolIcon,
    TrendingUpIcon
} from 'vue-tabler-icons';
import type { RecurringKind } from '@/features/recurring-payments/types';

/** Teinte de catégorie du kit (`su-tile--…`). */
export type RecurringTileTone = 'blue' | 'violet' | 'amber' | 'teal' | 'rose' | 'green' | 'gray';

export type RecurringTypeVisual = { icon: Component; tone: RecurringTileTone };

const EXPENSE_VISUALS: Record<string, RecurringTypeVisual> = {
    loyer: { icon: HomeIcon, tone: 'rose' },
    assurance: { icon: ShieldIcon, tone: 'green' },
    leasing: { icon: CarIcon, tone: 'teal' },
    credit: { icon: CreditCardIcon, tone: 'blue' },
    abonnement: { icon: RepeatIcon, tone: 'violet' },
    impot: { icon: ReceiptTaxIcon, tone: 'amber' },
    service: { icon: PlugIcon, tone: 'teal' },
    entretien: { icon: ToolIcon, tone: 'amber' },
    other: { icon: ReceiptIcon, tone: 'gray' }
};

const INCOME_VISUALS: Record<string, RecurringTypeVisual> = {
    salaire: { icon: BriefcaseIcon, tone: 'blue' },
    treiziemeSalaire: { icon: BriefcaseIcon, tone: 'blue' },
    prime: { icon: GiftIcon, tone: 'blue' },
    freelance: { icon: DeviceLaptopIcon, tone: 'blue' },
    loyerEncaisse: { icon: HomeIcon, tone: 'rose' },
    dividende: { icon: ChartLineIcon, tone: 'blue' },
    interet: { icon: PercentageIcon, tone: 'blue' },
    rente: { icon: BuildingBankIcon, tone: 'blue' },
    pension: { icon: BuildingBankIcon, tone: 'blue' },
    allocation: { icon: CashIcon, tone: 'blue' },
    remboursement: { icon: ArrowBackUpIcon, tone: 'blue' },
    other: { icon: TrendingUpIcon, tone: 'blue' }
};

/** Pictogramme trait + teinte d’un type de récurrence (maison = loyer, mallette = salaire, boucle = abonnement…). */
export function recurringTypeVisual(kind: RecurringKind, type: string | null | undefined): RecurringTypeVisual {
    const table = kind === 'income' ? INCOME_VISUALS : EXPENSE_VISUALS;
    return table[type ?? ''] ?? table.other;
}
