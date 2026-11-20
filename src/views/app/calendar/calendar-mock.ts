/**
 * Types du calendrier. La page n'est pas encore branchée sur les récurrences, échéances et
 * objectifs réels : seul le mode démo fournit des événements (`features/demo/calendar.ts`).
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

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function toYmd(year: number, month: number, day: number): string {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}
