import type { Category } from '@/features/categories/types';
import type { MonthFlows, MonthInsights, MonthSpendingKind, OtherCurrencyFlows } from '@/features/dashboard/insights';
import type { DemoDb } from '@/features/demo/db';
import type { ForecastLine, ForecastMonth, ForecastSource, YearForecast } from '@/features/forecasts/forecasts';
import { AppError } from '@/utils/errors/app-error';

/** Mêmes statuts « ouverts » que l'API : échéance pas encore réglée ni annulée. */
const OPEN_EXPENSE = new Set(['prevue', 'generee', 'enRetard']);
const OPEN_INCOME = new Set(['prevu', 'pending', 'retard']);
const KINDS: MonthSpendingKind[] = ['obligatoire', 'plaisir', 'epargne', 'nonClasse'];

type Flow = {
    amount: number;
    currency: string;
    isIncome: boolean;
    kind: MonthSpendingKind;
    planned: boolean;
    categoryPublicId?: string | null;
};

function round(value: number, digits = 2): number {
    const f = 10 ** digits;
    return Math.round(value * f) / f;
}

/** Type de dépense de chaque catégorie : le sien, sinon celui de sa racine, sinon « non classé ». */
function categoryKinds(roots: readonly Category[]): Map<string, MonthSpendingKind> {
    const kinds = new Map<string, MonthSpendingKind>();
    for (const root of roots) {
        const rootKind = root.spendingKind ?? null;
        kinds.set(root.publicId, rootKind ?? 'nonClasse');
        for (const child of root.children ?? []) {
            kinds.set(child.publicId, child.spendingKind ?? rootKind ?? 'nonClasse');
        }
    }
    return kinds;
}

function summarize(flows: readonly Flow[]): MonthFlows {
    const income = round(flows.filter((f) => f.isIncome).reduce((s, f) => s + f.amount, 0));
    const expenses = flows.filter((f) => !f.isIncome);
    const expense = round(expenses.reduce((s, f) => s + f.amount, 0));
    const balance = round(income - expense);
    const byKind = KINDS.map((kind) => {
        const amount = round(expenses.filter((f) => f.kind === kind).reduce((s, f) => s + f.amount, 0));
        return { kind, amount, share: expense > 0 ? round(amount / expense, 4) : 0 };
    });
    const savings = byKind.find((row) => row.kind === 'epargne')?.amount ?? 0;
    return {
        income,
        expense,
        balance,
        savingsRate: income > 0 ? round((balance + savings) / income, 4) : null,
        byKind,
        count: flows.length
    };
}

/** Sorties par catégorie connue (sinon `null`), de la plus grosse à la plus petite. */
function expenseByCategory(flows: readonly Flow[], roots: readonly Category[]): MonthInsights['expenseByCategory'] {
    const known = new Set(roots.flatMap((root) => [root.publicId, ...(root.children ?? []).map((child) => child.publicId)]));
    const totals = new Map<string | null, number>();
    for (const f of flows) {
        const key = f.categoryPublicId && known.has(f.categoryPublicId) ? f.categoryPublicId : null;
        totals.set(key, (totals.get(key) ?? 0) + f.amount);
    }
    return [...totals.entries()]
        .map(([categoryPublicId, amount]) => ({ categoryPublicId, amount: round(amount) }))
        .sort((a, b) => b.amount - a.amount || String(a.categoryPublicId).localeCompare(String(b.categoryPublicId)));
}

/** `GET /api/insights/month` du mode démo : mêmes règles que l'API, sur la base de l'onglet. */
export function demoMonthInsights(db: DemoDb, month: string | null, currency: string | null, through: string | null = null): MonthInsights {
    const now = new Date();
    const key =
        month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, mon] = key.split('-').map(Number);
    const from = `${key}-01`;
    const monthEnd = `${key}-${String(new Date(year, mon, 0).getDate()).padStart(2, '0')}`;
    if (through && (through < from || through > monthEnd)) throw new AppError('La date de fin doit être dans le mois demandé.', 400);
    const to = through || monthEnd;
    const main =
        currency?.trim().toUpperCase() ||
        db.accounts.find((a) => a.isOwned && a.isPrimary && a.isActive)?.currency ||
        db.settings.defaultCurrency ||
        'CHF';

    const kinds = categoryKinds(db.categories);
    const kindOf = (categoryPublicId: string | null | undefined): MonthSpendingKind =>
        (categoryPublicId && kinds.get(categoryPublicId)) || 'nonClasse';
    const accountType = new Map(db.accounts.map((a) => [a.publicId, a.type]));
    const inMonth = (date: string) => date >= from && date <= to;

    const flows: Flow[] = [];
    let savingsTransfers = 0;
    for (const tx of db.transactions) {
        if (!inMonth(tx.operationDate) || tx.amount == null) continue;
        const amount = Math.abs(tx.amount);
        if (tx.type === 'revenu') flows.push({ amount, currency: tx.currency, isIncome: true, kind: 'nonClasse', planned: false });
        else if (tx.type === 'depense')
            flows.push({
                amount,
                currency: tx.currency,
                isIncome: false,
                kind: kindOf(tx.categoryPublicId),
                planned: false,
                categoryPublicId: tx.categoryPublicId ?? null
            });
        else if (tx.type === 'transfert' && tx.currency === main) {
            const toSavings = tx.movements.some((m) => m.sens === 'credit' && accountType.get(m.accountPublicId) === 'epargne');
            const fromSavings = tx.movements.some((m) => m.sens === 'debit' && accountType.get(m.accountPublicId) === 'epargne');
            if (toSavings && !fromSavings) savingsTransfers += amount;
        }
    }

    for (const expense of db.recurringExpenses) {
        if (!expense.isActive) continue;
        for (const due of db.expenseDues[expense.publicId] ?? []) {
            if (!OPEN_EXPENSE.has(due.status) || due.transactionPublicId || !inMonth(due.scheduledAt)) continue;
            flows.push({
                amount: Math.abs(due.plannedAmount),
                currency: expense.currency,
                isIncome: false,
                kind: kindOf(expense.categoryPublicId),
                planned: true
            });
        }
    }
    for (const income of db.recurringIncomes) {
        if (!income.isActive) continue;
        for (const due of db.incomeDues[income.publicId] ?? []) {
            if (!OPEN_INCOME.has(due.status) || due.transactionPublicId || !inMonth(due.scheduledAt)) continue;
            flows.push({
                amount: Math.abs(due.plannedAmount),
                currency: income.currency,
                isIncome: true,
                kind: 'nonClasse',
                planned: true
            });
        }
    }

    const mainFlows = flows.filter((f) => f.currency === main);
    const others = new Map<string, OtherCurrencyFlows>();
    for (const f of flows.filter((x) => x.currency !== main)) {
        const row = others.get(f.currency) ?? {
            currency: f.currency,
            actualIncome: 0,
            actualExpense: 0,
            plannedIncome: 0,
            plannedExpense: 0
        };
        if (f.planned) {
            if (f.isIncome) row.plannedIncome += f.amount;
            else row.plannedExpense += f.amount;
        } else if (f.isIncome) row.actualIncome += f.amount;
        else row.actualExpense += f.amount;
        others.set(f.currency, row);
    }

    return {
        month: key,
        from,
        to,
        currency: main,
        actual: summarize(mainFlows.filter((f) => !f.planned)),
        planned: summarize(mainFlows.filter((f) => f.planned)),
        total: summarize(mainFlows),
        savingsTransfers: round(savingsTransfers),
        otherCurrencies: [...others.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
        hiddenCount: 0,
        expenseByCategory: expenseByCategory(
            mainFlows.filter((f) => !f.planned && !f.isIncome),
            db.categories
        )
    };
}

/**
 * `GET /api/forecasts/year` du mode démo : le constaté et les échéances ouvertes de chaque mois (calcul de M1).
 * Approximation : pas de budget ni de moyenne pour les mois futurs, les échéances prévues sont regroupées en une ligne.
 */
export function demoYearForecast(db: DemoDb, year: string | null, currency: string | null): YearForecast {
    const now = new Date();
    const target = year && /^\d{4}$/.test(year) ? Number(year) : now.getFullYear();
    if (target < 1900 || target > 2200) throw new AppError('Année invalide.', 400);
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const names = new Map(db.categories.flatMap((root) => [root, ...(root.children ?? [])]).map((c) => [c.publicId, c.name]));
    const kinds = categoryKinds(db.categories);
    let main = currency;
    let cumulative = 0;
    const months: ForecastMonth[] = [];
    for (let m = 1; m <= 12; m++) {
        const key = `${target}-${String(m).padStart(2, '0')}`;
        const insights = demoMonthInsights(db, key, main);
        main = insights.currency;
        const lines: ForecastLine[] = [];
        const add = (partial: Partial<ForecastLine> & Pick<ForecastLine, 'direction' | 'amount' | 'source'>) =>
            lines.push({
                label: null,
                categoryPublicId: null,
                spendingKind: null,
                recurrencePublicId: null,
                budgetPublicId: null,
                ...partial
            });
        if (insights.actual.income > 0) add({ direction: 'revenu', amount: insights.actual.income, source: 'constate' });
        for (const row of insights.expenseByCategory) {
            const kind = row.categoryPublicId ? kinds.get(row.categoryPublicId) : undefined;
            add({
                direction: 'depense',
                amount: row.amount,
                source: 'constate',
                label: row.categoryPublicId ? (names.get(row.categoryPublicId) ?? null) : null,
                categoryPublicId: row.categoryPublicId,
                spendingKind: kind && kind !== 'nonClasse' ? kind : null
            });
        }
        if (insights.planned.income > 0) add({ direction: 'revenu', amount: insights.planned.income, source: 'recurrence' });
        if (insights.planned.expense > 0) add({ direction: 'depense', amount: insights.planned.expense, source: 'recurrence' });
        cumulative = round(cumulative + insights.total.balance);
        const sum = (source: ForecastSource, income: boolean) =>
            round(lines.filter((l) => l.source === source && (l.direction === 'revenu') === income).reduce((s, l) => s + l.amount, 0));
        months.push({
            month: key,
            phase: key < currentKey ? 'passe' : key === currentKey ? 'courant' : 'futur',
            flows: insights.total,
            cumulativeBalance: cumulative,
            sources: (['constate', 'recurrence', 'budget', 'moyenne'] as const).map((source) => ({
                source,
                income: sum(source, true),
                expense: sum(source, false)
            })),
            lines
        });
    }
    const used = new Set<string>([main ?? 'CHF']);
    for (const account of db.accounts) if (account.isActive && account.currency) used.add(account.currency);
    for (const item of [...db.recurringExpenses, ...db.recurringIncomes]) if (item.currency) used.add(item.currency);
    return { year: target, currency: main ?? 'CHF', months, currencies: [...used].sort() };
}
