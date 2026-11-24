import type { CalendarOccurrence } from '@/features/calendar/types';

/** Au-delà, une occurrence n'est plus étalée jour par jour (garde-fou contre une date de fin aberrante). */
const MAX_SPAN_DAYS = 62;

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** `month` commence à 0, comme `Date`. */
export function toYmd(year: number, month: number, day: number): string {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Date calendaire locale d'un instant. */
export function ymdOf(date: Date): string {
    return toYmd(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseYmd(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function addDaysYmd(ymd: string, days: number): string {
    const date = parseYmd(ymd);
    date.setDate(date.getDate() + days);
    return ymdOf(date);
}

/** Lundi de la semaine de `ymd`. */
export function weekStartYmd(ymd: string): string {
    return addDaysYmd(ymd, -((parseYmd(ymd).getDay() + 6) % 7));
}

/** Les sept jours, du lundi au dimanche, de la semaine de `ymd`. */
export function weekDays(ymd: string): string[] {
    const start = weekStartYmd(ymd);
    return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i));
}

export type MonthGrid = {
    /** Premier jour affiché (début de la première semaine). */
    from: string;
    /** Dernier jour affiché (fin de la dernière semaine). */
    to: string;
    /** 4 à 6 semaines : pas de rangée entière hors du mois. */
    weekCount: number;
    days: string[];
};

/** Grille d'un mois en semaines commençant le lundi. */
export function monthGrid(year: number, month: number): MonthGrid {
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const weekCount = Math.ceil((offset + lastDay) / 7);
    const days = Array.from({ length: weekCount * 7 }, (_, i) => ymdOf(new Date(year, month, 1 - offset + i)));
    return { from: days[0], to: days[days.length - 1], weekCount, days };
}

/**
 * Jours locaux couverts par une occurrence. Journée entière : `startDate` à `endDate` inclus.
 * Horaire : du jour du début au jour de la dernière minute (un événement qui finit à minuit ne déborde pas).
 */
export function occurrenceDays(occurrence: CalendarOccurrence): string[] {
    let first: string | null = null;
    let last: string | null = null;
    if (occurrence.isFullDay || !occurrence.startUtc) {
        first = occurrence.startDate;
        last = occurrence.endDate ?? occurrence.startDate;
    } else {
        const start = new Date(occurrence.startUtc);
        const end = occurrence.endUtc ? new Date(occurrence.endUtc) : start;
        first = ymdOf(start);
        last = end > start ? ymdOf(new Date(end.getTime() - 1)) : first;
    }
    if (!first) return [];
    if (!last || last < first) return [first];

    const days = [first];
    while (days[days.length - 1] < last && days.length < MAX_SPAN_DAYS) {
        days.push(addDaysYmd(days[days.length - 1], 1));
    }
    return days;
}
