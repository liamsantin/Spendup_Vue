import {
    insuranceTaxNature,
    type CreateRecurringExpensePayload,
    type CreateRecurringIncomePayload,
    type InsuranceDetails,
    type InsuranceInput,
    type RecurringDue,
    type RecurringExpense,
    type RecurringIncome
} from '@/features/recurring-payments/types';

const NOW = '2026-11-14T09:00:00.000Z';

type ExpenseDraft = {
    publicId: string;
    name: string;
    expenseType: RecurringExpense['expenseType'];
    frequency: RecurringExpense['frequency'];
    plannedAmount: number;
    day: number;
    every: number;
    anchor: string;
    accountPublicId: string;
    paymentMethodPublicId: string | null;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    tagPublicIds: string[];
    notes: string | null;
    insurance?: InsuranceInput;
};

type IncomeDraft = {
    publicId: string;
    name: string;
    incomeType: RecurringIncome['incomeType'];
    frequency: RecurringIncome['frequency'];
    plannedAmount: number;
    day: number;
    every: number;
    anchor: string;
    accountPublicId: string;
    categoryPublicId: string | null;
    tierPublicId: string | null;
    notes: string | null;
};

const EXPENSES: ExpenseDraft[] = [
    {
        publicId: 'REXLOYR',
        name: 'Loyer',
        expenseType: 'loyer',
        frequency: 'mensuel',
        plannedAmount: 1850,
        day: 2,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        paymentMethodPublicId: 'PM00003',
        categoryPublicId: 'CATLOYR',
        tierPublicId: 'TIERREG',
        tagPublicIds: ['TAGHOME'],
        notes: null
    },
    {
        publicId: 'REXCSS1',
        name: 'Assurance maladie',
        expenseType: 'assurance',
        frequency: 'mensuel',
        plannedAmount: 385.2,
        day: 1,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        paymentMethodPublicId: 'PM00001',
        categoryPublicId: null,
        tierPublicId: 'TIERCSS',
        tagPublicIds: [],
        notes: 'LAMal',
        insurance: {
            insuranceType: 'healthBasic',
            renewalDate: '2027-01-01',
            franchise: 2500,
            grossPremium: 445.2,
            premiumSubsidy: 60,
            policyNumber: '756.1234.5678.97'
        }
    },
    {
        publicId: 'REXCFF1',
        name: 'Abonnement CFF',
        expenseType: 'abonnement',
        frequency: 'mensuel',
        plannedAmount: 175,
        day: 8,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        paymentMethodPublicId: 'PM00001',
        categoryPublicId: 'CATPUBL',
        tierPublicId: 'TIERCFF',
        tagPublicIds: [],
        notes: null
    },
    {
        publicId: 'REXSWC1',
        name: 'Swisscom',
        expenseType: 'abonnement',
        frequency: 'mensuel',
        plannedAmount: 79.9,
        day: 15,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        paymentMethodPublicId: 'PM00001',
        categoryPublicId: null,
        tierPublicId: 'TIERSWC',
        tagPublicIds: [],
        notes: null
    },
    {
        publicId: 'REXNFL1',
        name: 'Netflix',
        expenseType: 'abonnement',
        frequency: 'mensuel',
        plannedAmount: 18.9,
        day: 12,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        paymentMethodPublicId: 'PM00001',
        categoryPublicId: null,
        tierPublicId: 'TIERNFL',
        tagPublicIds: [],
        notes: null
    },
    {
        publicId: 'REXIMP1',
        name: 'Acompte d’impôts',
        expenseType: 'impot',
        frequency: 'trimestriel',
        plannedAmount: 2085.2,
        day: 28,
        every: 3,
        anchor: '2026-02',
        accountPublicId: 'ACCCOUR',
        paymentMethodPublicId: null,
        categoryPublicId: null,
        tierPublicId: 'TIERIMP',
        tagPublicIds: [],
        notes: 'Canton de Vaud'
    }
];

const INCOMES: IncomeDraft[] = [
    {
        publicId: 'RINSAL1',
        name: 'Salaire',
        incomeType: 'salaire',
        frequency: 'mensuelle',
        plannedAmount: 6200,
        day: 1,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        categoryPublicId: 'CATSALN',
        tierPublicId: 'TIEREMP',
        notes: 'Atelier Horizon'
    },
    {
        publicId: 'RINALL1',
        name: 'Allocations familiales',
        incomeType: 'allocation',
        frequency: 'mensuelle',
        plannedAmount: 322,
        day: 10,
        every: 1,
        anchor: '2024-01',
        accountPublicId: 'ACCCOUR',
        categoryPublicId: null,
        tierPublicId: null,
        notes: null
    }
];

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function todayYmd(date = new Date()): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function datesFor(anchor: string, every: number, day: number, today = todayYmd()): string[] {
    const [yearText, monthText] = anchor.split('-');
    const anchorIndex = Number(yearText) * 12 + (Number(monthText) - 1);
    const [todayYear, todayMonth] = today.split('-').map(Number);
    const nowIndex = todayYear * 12 + (todayMonth - 1);
    const from = nowIndex - 2;
    const to = nowIndex + 4;
    const dates: string[] = [];
    for (let index = anchorIndex; index <= to; index += every) {
        if (index < from) continue;
        const year = Math.floor(index / 12);
        const month = index % 12;
        const last = new Date(year, month + 1, 0).getDate();
        dates.push(`${year}-${pad(month + 1)}-${pad(Math.min(day, last))}`);
    }
    return dates;
}

function duesFor(
    publicId: string,
    amount: number,
    dates: string[],
    pastStatus: string,
    futureStatus: string,
    today = todayYmd()
): RecurringDue[] {
    return dates.map((scheduledAt, index) => {
        const past = scheduledAt < today;
        return {
            publicId: `${publicId}${index}`,
            scheduledAt,
            plannedAmount: amount,
            actualAmount: past ? amount : null,
            status: past ? pastStatus : futureStatus,
            transactionPublicId: null,
            notes: null
        };
    });
}

function nextOpen(dues: RecurringDue[], today = todayYmd()): string | null {
    return dues.find((due) => due.scheduledAt >= today && !due.transactionPublicId)?.scheduledAt ?? null;
}

function expenseFrom(draft: ExpenseDraft, dues: RecurringDue[]): RecurringExpense {
    const today = todayYmd();
    return {
        publicId: draft.publicId,
        name: draft.name,
        expenseType: draft.expenseType,
        frequency: draft.frequency,
        plannedAmount: draft.plannedAmount,
        currency: 'CHF',
        startDate: `${draft.anchor}-01`,
        endDate: null,
        nextDueDate: nextOpen(dues, today),
        isActive: true,
        accountPublicId: draft.accountPublicId,
        paymentMethodPublicId: draft.paymentMethodPublicId,
        categoryPublicId: draft.categoryPublicId,
        tierPublicId: draft.tierPublicId,
        tagPublicIds: draft.tagPublicIds,
        notes: draft.notes,
        createdAt: NOW,
        updatedAt: null,
        upcomingDues: dues.filter((due) => due.scheduledAt >= today).slice(0, 3),
        files: [],
        insurance: draft.insurance ? insuranceDetails(draft.insurance) : null
    };
}

/** Fiche d'assurance renvoyée, avec la nature fiscale déduite du type (comme l'API). */
export function insuranceDetails(input: InsuranceInput): InsuranceDetails {
    return { ...input, taxNature: insuranceTaxNature(input.insuranceType) };
}

function incomeFrom(draft: IncomeDraft, dues: RecurringDue[]): RecurringIncome {
    const today = todayYmd();
    return {
        publicId: draft.publicId,
        name: draft.name,
        incomeType: draft.incomeType,
        frequency: draft.frequency,
        plannedAmount: draft.plannedAmount,
        currency: 'CHF',
        startDate: `${draft.anchor}-01`,
        endDate: null,
        nextDueDate: nextOpen(dues, today),
        isActive: true,
        accountPublicId: draft.accountPublicId,
        paymentMethodPublicId: null,
        categoryPublicId: draft.categoryPublicId,
        tierPublicId: draft.tierPublicId,
        notes: draft.notes,
        paymentDay: draft.day,
        createdAt: NOW,
        updatedAt: null,
        upcomingDues: dues.filter((due) => due.scheduledAt >= today).slice(0, 3)
    };
}

export function seedRecurringHousehold(): {
    recurringExpenses: RecurringExpense[];
    recurringIncomes: RecurringIncome[];
    expenseDues: Record<string, RecurringDue[]>;
    incomeDues: Record<string, RecurringDue[]>;
} {
    const expenseDues: Record<string, RecurringDue[]> = {};
    const incomeDues: Record<string, RecurringDue[]> = {};
    const recurringExpenses = EXPENSES.map((draft) => {
        const dues = duesFor(draft.publicId, draft.plannedAmount, datesFor(draft.anchor, draft.every, draft.day), 'payee', 'prevue');
        expenseDues[draft.publicId] = dues;
        return expenseFrom(draft, dues);
    });
    const recurringIncomes = INCOMES.map((draft) => {
        const dues = duesFor(draft.publicId, draft.plannedAmount, datesFor(draft.anchor, draft.every, draft.day), 'encaisse', 'prevu');
        incomeDues[draft.publicId] = dues;
        return incomeFrom(draft, dues);
    });
    return { recurringExpenses, recurringIncomes, expenseDues, incomeDues };
}

export function refreshExpenseUpcoming(expense: RecurringExpense, dues: RecurringDue[]) {
    const today = todayYmd();
    expense.nextDueDate = nextOpen(dues, today);
    expense.upcomingDues = dues.filter((due) => due.scheduledAt >= today).slice(0, 3);
}

export function refreshIncomeUpcoming(income: RecurringIncome, dues: RecurringDue[]) {
    const today = todayYmd();
    income.nextDueDate = nextOpen(dues, today);
    income.upcomingDues = dues.filter((due) => due.scheduledAt >= today).slice(0, 3);
}

function everyMonths(frequency: string): number {
    if (frequency.startsWith('trimestr')) return 3;
    if (frequency.startsWith('semestr')) return 6;
    if (frequency.startsWith('annuel')) return 12;
    return 1;
}

export function duesFromExpense(expense: RecurringExpense): RecurringDue[] {
    const day = Number(expense.startDate.slice(8, 10)) || 1;
    const anchor = expense.startDate.slice(0, 7);
    return duesFor(expense.publicId, expense.plannedAmount, datesFor(anchor, everyMonths(expense.frequency), day), 'payee', 'prevue');
}

export function duesFromIncome(income: RecurringIncome): RecurringDue[] {
    const day = income.paymentDay || Number(income.startDate.slice(8, 10)) || 1;
    const anchor = income.startDate.slice(0, 7);
    return duesFor(income.publicId, income.plannedAmount, datesFor(anchor, everyMonths(income.frequency), day), 'encaisse', 'prevu');
}

export function expenseFromPayload(publicId: string, body: CreateRecurringExpensePayload): RecurringExpense {
    return {
        publicId,
        name: body.name,
        expenseType: body.expenseType,
        frequency: body.frequency,
        plannedAmount: body.plannedAmount,
        currency: 'CHF',
        startDate: body.startDate,
        endDate: body.endDate,
        nextDueDate: null,
        isActive: body.isActive,
        accountPublicId: body.accountPublicId,
        paymentMethodPublicId: body.paymentMethodPublicId,
        categoryPublicId: body.categoryPublicId,
        tierPublicId: body.tierPublicId,
        tagPublicIds: body.tagPublicIds ?? [],
        notes: body.notes,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        upcomingDues: [],
        files: [],
        insurance: body.expenseType === 'assurance' && body.insurance ? insuranceDetails(body.insurance) : null
    };
}

export function incomeFromPayload(publicId: string, body: CreateRecurringIncomePayload): RecurringIncome {
    return {
        publicId,
        name: body.name,
        incomeType: body.incomeType,
        frequency: body.frequency,
        plannedAmount: body.plannedAmount,
        currency: 'CHF',
        startDate: body.startDate,
        endDate: body.endDate,
        nextDueDate: null,
        isActive: body.isActive,
        accountPublicId: body.accountPublicId,
        paymentMethodPublicId: body.paymentMethodPublicId,
        categoryPublicId: body.categoryPublicId,
        tierPublicId: body.tierPublicId,
        notes: body.notes,
        paymentDay: body.paymentDay,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        upcomingDues: []
    };
}
