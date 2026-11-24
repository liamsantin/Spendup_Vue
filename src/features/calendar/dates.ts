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

/**
 * Premier jour de la semaine de `ymd`. `weekStartsOn` : 1 = lundi … 7 = dimanche.
 */
export function weekStartYmd(ymd: string, weekStartsOn = 1): string {
    const start = weekStartsOn % 7;
    return addDaysYmd(ymd, -((parseYmd(ymd).getDay() - start + 7) % 7));
}

/** Les sept jours de la semaine de `ymd`, à partir de `weekStartsOn`. */
export function weekDays(ymd: string, weekStartsOn = 1): string[] {
    const start = weekStartYmd(ymd, weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i));
}

/** Retire les samedis et dimanches, en gardant l'ordre de la semaine. */
export function visibleDays(days: string[], showWeekends: boolean): string[] {
    if (showWeekends) return days;
    return days.filter((ymd) => {
        const day = parseYmd(ymd).getDay();
        return day !== 0 && day !== 6;
    });
}

/** Numéro de semaine ISO (semaine du lundi, semaine 1 = celle du premier jeudi). */
export function isoWeek(ymd: string): number {
    const date = parseYmd(ymd);
    const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const first = new Date(thursday.getFullYear(), 0, 4);
    first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return 1 + Math.round((thursday.getTime() - first.getTime()) / 86_400_000 / 7);
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

/** Grille d'un mois en semaines commençant à `weekStartsOn` (1 = lundi … 7 = dimanche). */
export function monthGrid(year: number, month: number, weekStartsOn = 1): MonthGrid {
    const offset = (new Date(year, month, 1).getDay() - (weekStartsOn % 7) + 7) % 7;
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
