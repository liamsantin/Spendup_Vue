/**
 * TEMPORAIRE — données de démonstration du calendrier, à supprimer quand la page sera branchée
 * sur les récurrences, échéances et objectifs réels.
 */

export type CalendarEventKind = 'income' | 'expense' | 'due' | 'goal';

export type CalendarEvent = {
    id: string;
    /** Date calendaire `yyyy-MM-dd`. */
    date: string;
    title: string;
    kind: CalendarEventKind;
    /** Signé : négatif = sortie. */
    amount: number;
    account: string;
    /** Ex. « Mensuel », « 10/12 ». */
    note?: string;
};

type MonthlyTemplate = Omit<CalendarEvent, 'id' | 'date'> & { day: number | 'last' };

const MONTHLY: MonthlyTemplate[] = [
    { day: 1, title: 'Loyer', kind: 'expense', amount: -1890, account: 'Compte courant', note: 'Mensuel' },
    { day: 5, title: 'Assurance maladie', kind: 'expense', amount: -412.8, account: 'Compte courant', note: 'Mensuel' },
    { day: 8, title: 'Abonnement CFF', kind: 'expense', amount: -340, account: 'Carte Visa', note: 'Mensuel' },
    { day: 10, title: 'Allocations familiales', kind: 'income', amount: 322, account: 'Compte courant', note: 'Mensuel' },
    { day: 12, title: 'Netflix', kind: 'expense', amount: -18.9, account: 'Carte Visa', note: 'Mensuel' },
    { day: 12, title: 'Spotify', kind: 'expense', amount: -12.95, account: 'Carte Visa', note: 'Mensuel' },
    { day: 15, title: 'Facture Swisscom', kind: 'due', amount: -79.9, account: 'Compte courant', note: 'À payer' },
    { day: 20, title: 'Leasing voiture', kind: 'expense', amount: -389, account: 'Compte courant', note: 'Mensuel' },
    { day: 25, title: 'Salaire', kind: 'income', amount: 6250, account: 'Compte courant', note: 'Mensuel' },
    { day: 26, title: 'Épargne vacances', kind: 'goal', amount: -300, account: 'Compte épargne', note: 'Objectif · 1 800 / 3 000' },
    { day: 28, title: '3e pilier', kind: 'goal', amount: -588, account: 'Compte épargne', note: 'Objectif annuel' },
    { day: 'last', title: 'Acompte d’impôts', kind: 'due', amount: -2085.2, account: 'Compte courant', note: 'Échéance' }
];

/** Événements ponctuels, placés selon le mois pour varier l’affichage. */
const ONE_OFF: { day: number; monthMod: number; event: Omit<CalendarEvent, 'id' | 'date'> }[] = [
    {
        day: 3,
        monthMod: 0,
        event: { title: 'Remboursement Marie', kind: 'income', amount: 45, account: 'Compte courant', note: 'Ponctuel' }
    },
    { day: 14, monthMod: 1, event: { title: 'Révision vélo', kind: 'due', amount: -160, account: 'Carte Visa', note: 'À payer' } },
    { day: 17, monthMod: 0, event: { title: 'Vente Ricardo', kind: 'income', amount: 120, account: 'Compte courant', note: 'Ponctuel' } },
    { day: 22, monthMod: 2, event: { title: 'Dentiste', kind: 'due', amount: -280, account: 'Compte courant', note: 'Facture' } }
];

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function toYmd(year: number, month: number, day: number): string {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Événements de démonstration du mois (`month` 0-based). */
export function mockEventsForMonth(year: number, month: number): CalendarEvent[] {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const events: CalendarEvent[] = MONTHLY.map((item, index) => {
        const day = item.day === 'last' ? lastDay : Math.min(item.day, lastDay);
        const { day: _day, ...rest } = item;
        void _day;
        return { ...rest, id: `m-${year}-${month}-${index}`, date: toYmd(year, month, day) };
    });
    ONE_OFF.forEach((item, index) => {
        if (month % 3 !== item.monthMod) return;
        events.push({ ...item.event, id: `o-${year}-${month}-${index}`, date: toYmd(year, month, Math.min(item.day, lastDay)) });
    });
    return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
