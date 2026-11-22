import { fetchWrapper } from '@/utils/helpers/fetch-helpers';

/**
 * Calculateur de remboursement (`POST /api/liabilities/repayment-simulation`) : durée, total remboursé et coût des intérêts
 * pour un capital, un taux annuel et une mensualité. Sans état ; la page calcule en local pendant la saisie (même méthode
 * que l'API : taux mensuel = taux annuel / 12, paiements en fin de mois, dernière mensualité réduite au restant dû).
 */
export const REPAYMENT_SIMULATOR_PATH = '/app/planning/simulateur-remboursement';

/** Au-delà de 100 ans de mensualités, aucune durée n'est annoncée (même limite que l'API). */
export const REPAYMENT_MAX_MONTHS = 1200;

export type RepaymentStatus = 'repaid' | 'neverRepaid' | 'tooLong';

export interface RepaymentRequest {
    principal: number;
    annualRatePercent: number;
    monthlyPayment: number;
}

export interface RepaymentResult {
    status: RepaymentStatus;
    principal: number;
    annualRatePercent: number;
    monthlyPayment: number;
    firstMonthInterest: number;
    /** Plus petite mensualité qui rembourse (intérêts du premier mois + 0,01). */
    minimumPayment: number;
    months: number | null;
    totalPaid: number | null;
    totalInterest: number | null;
    lastPayment: number | null;
}

export const repaymentApi = {
    simulate(request: RepaymentRequest) {
        return fetchWrapper.post('/api/liabilities/repayment-simulation', request) as Promise<RepaymentResult>;
    }
};

const cents = (value: number): number => Math.round(value * 100);
const fromCents = (value: number): number => value / 100;

/** Simulation locale. Les montants sont comptés en centimes pour éviter les écarts d'arrondi à virgule flottante. */
export function simulateRepayment(request: RepaymentRequest): RepaymentResult {
    const principal = cents(request.principal);
    const payment = cents(request.monthlyPayment);
    const rate = request.annualRatePercent;
    const monthlyRate = rate / 100 / 12;
    const interestOf = (balance: number): number => Math.round(balance * monthlyRate);

    const firstInterest = interestOf(principal);
    const base = {
        principal: request.principal,
        annualRatePercent: rate,
        monthlyPayment: request.monthlyPayment,
        firstMonthInterest: fromCents(firstInterest),
        minimumPayment: fromCents(firstInterest + 1)
    };
    const unresolved = { months: null, totalPaid: null, totalInterest: null, lastPayment: null };

    if (monthlyRate > 0 && payment <= firstInterest) return { ...base, ...unresolved, status: 'neverRepaid' };

    let balance = principal;
    let months = 0;
    let totalPaid = 0;
    let last = 0;
    while (balance > 0) {
        if (months === REPAYMENT_MAX_MONTHS) return { ...base, ...unresolved, status: 'tooLong' };
        const due = balance + interestOf(balance);
        last = Math.min(payment, due);
        totalPaid += last;
        balance = due - last;
        months++;
    }
    return {
        ...base,
        status: 'repaid',
        months,
        totalPaid: fromCents(totalPaid),
        totalInterest: fromCents(totalPaid - principal),
        lastPayment: fromCents(last)
    };
}
