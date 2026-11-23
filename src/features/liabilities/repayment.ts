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
    /** Tableau d'amortissement (une ligne par mois), `null` hors statut `repaid`. */
    schedule: RepaymentScheduleRow[] | null;
}

/** Une échéance : intérêts du mois, part de capital remboursée, restant dû après l'échéance. */
export interface RepaymentScheduleRow {
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
}

/** Une année du tableau : sommes de l'année et restant dû à la fin de l'année (ou de la dernière échéance). */
export interface RepaymentYearRow {
    year: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
}

/** Regroupe les échéances par année (mois 1 à 12 = année 1). */
export function repaymentYears(schedule: RepaymentScheduleRow[]): RepaymentYearRow[] {
    const years: RepaymentYearRow[] = [];
    for (const row of schedule) {
        const year = Math.ceil(row.month / 12);
        let current = years[years.length - 1];
        if (!current || current.year !== year) {
            current = { year, payment: 0, interest: 0, principal: 0, balance: 0 };
            years.push(current);
        }
        current.payment = Math.round((current.payment + row.payment) * 100) / 100;
        current.interest = Math.round((current.interest + row.interest) * 100) / 100;
        current.principal = Math.round((current.principal + row.principal) * 100) / 100;
        current.balance = row.balance;
    }
    return years;
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
    const unresolved = { months: null, totalPaid: null, totalInterest: null, lastPayment: null, schedule: null };

    if (monthlyRate > 0 && payment <= firstInterest) return { ...base, ...unresolved, status: 'neverRepaid' };

    let balance = principal;
    let months = 0;
    let totalPaid = 0;
    let last = 0;
    const schedule: RepaymentScheduleRow[] = [];
    while (balance > 0) {
        if (months === REPAYMENT_MAX_MONTHS) return { ...base, ...unresolved, status: 'tooLong' };
        const interest = interestOf(balance);
        const due = balance + interest;
        last = Math.min(payment, due);
        totalPaid += last;
        balance = due - last;
        months++;
        schedule.push({
            month: months,
            payment: fromCents(last),
            interest: fromCents(interest),
            principal: fromCents(last - interest),
            balance: fromCents(balance)
        });
    }
    return {
        ...base,
        status: 'repaid',
        months,
        totalPaid: fromCents(totalPaid),
        totalInterest: fromCents(totalPaid - principal),
        lastPayment: fromCents(last),
        schedule
    };
}
