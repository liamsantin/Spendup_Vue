import type { CalendarEvent, CalendarEventKind } from '@/views/app/calendar/calendar-mock';
import { demoDb } from '@/features/demo/db';

type Projected = {
    day: number;
    title: string;
    kind: CalendarEventKind;
    amount: number;
    account: string;
    note?: string;
};

/** Rythme du foyer d’exemple, pour les mois sans écriture saisie. */
const PROJECTED: Projected[] = [
    { day: 1, title: 'Salaire', kind: 'income', amount: 6200, account: 'Compte courant', note: 'Mensuel' },
    { day: 2, title: 'Loyer', kind: 'expense', amount: -1850, account: 'Compte courant', note: 'Régie du Lac · Mensuel' },
    { day: 5, title: 'Migros', kind: 'expense', amount: -86.4, account: 'Compte courant', note: 'Courses' },
    { day: 8, title: 'CFF', kind: 'expense', amount: -42, account: 'Compte courant', note: 'Transports' },
    { day: 10, title: 'Restaurant', kind: 'expense', amount: -64.5, account: 'Compte courant', note: 'Sorties' },
    { day: 12, title: 'Versement vacances', kind: 'goal', amount: -200, account: 'Épargne', note: 'Objectif' }
];

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function ymd(year: number, month: number, day: number): string {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function accountName(publicId: string): string {
    return demoDb().accounts.find((account) => account.publicId === publicId)?.name ?? 'Compte';
}

function kindOf(type: string, savingsGoalPublicId: string | null): CalendarEventKind {
    if (savingsGoalPublicId) return 'goal';
    if (type === 'revenu') return 'income';
    if (type === 'transfert') return 'expense';
    return 'expense';
}

function signedAmount(type: string, amount: number): number {
    if (type === 'revenu') return amount;
    return -Math.abs(amount);
}

/** Événements du mois : écritures du foyer, complétées par le rythme mensuel. */
export function demoEventsForMonth(year: number, month: number): CalendarEvent[] {
    const db = demoDb();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prefix = `${year}-${pad(month + 1)}`;
    const goal = db.goals.find((item) => item.publicId === 'GOALVAC');
    const goalNote = goal ? `Objectif · ${Math.round(goal.currentAmount)} / ${Math.round(goal.targetAmount)}` : 'Objectif';

    const fromTransactions: CalendarEvent[] = db.transactions
        .filter((tx) => tx.operationDate.startsWith(prefix))
        .map((tx) => {
            const accountId = tx.movements[0]?.accountPublicId ?? '';
            const kind = kindOf(tx.type, tx.savingsGoalPublicId);
            return {
                id: tx.publicId,
                date: tx.operationDate,
                title: tx.label,
                kind,
                amount: signedAmount(tx.type, tx.amount ?? 0),
                account: accountName(accountId),
                note: kind === 'goal' ? goalNote : undefined
            };
        });

    const seen = new Set(fromTransactions.map((event) => `${event.date}|${event.title}`));
    const projected: CalendarEvent[] = PROJECTED.flatMap((item, index) => {
        const day = Math.min(item.day, lastDay);
        const date = ymd(year, month, day);
        const title = item.title === 'Salaire' ? `Salaire ${monthName(month)}` : item.title;
        if (seen.has(`${date}|${title}`) || fromTransactions.some((event) => event.date === date && sameFamily(event.title, item.title))) {
            return [];
        }
        return [
            {
                id: `demo-${year}-${month}-${index}`,
                date,
                title,
                kind: item.kind,
                amount: item.amount,
                account: item.account,
                note: item.kind === 'goal' ? goalNote : item.note
            }
        ];
    });

    return [...fromTransactions, ...projected].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function monthName(month: number): string {
    return MONTHS[month] ?? '';
}

function sameFamily(title: string, projectedTitle: string): boolean {
    const left = title.toLowerCase();
    const right = projectedTitle.toLowerCase();
    return left === right || left.startsWith(`${right} `);
}
