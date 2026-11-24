import { formatSwissNumber } from '@/features/accounts/format';
import { occurrenceDays } from '@/features/calendar/dates';
import type { CalendarOccurrence, CalendarTone } from '@/features/calendar/types';

const SOURCE_TONES: Record<string, CalendarTone> = {
    recurringIncome: 'income',
    recurringExpense: 'expense',
    savingsGoal: 'goal',
    sharedDebt: 'due',
    personalLoan: 'due',
    liability: 'due'
};

export function occurrenceTone(occurrence: CalendarOccurrence): CalendarTone {
    if (!occurrence.sourceKey) return 'event';
    return SOURCE_TONES[occurrence.sourceKey] ?? ((occurrence.amount ?? 0) > 0 ? 'income' : 'due');
}

export function isCanceled(occurrence: CalendarOccurrence): boolean {
    return occurrence.status === 'annule';
}

/** Journées entières d'abord, puis par heure de début, puis par titre. */
function compareOccurrences(a: CalendarOccurrence, b: CalendarOccurrence): number {
    const allDay = Number(!a.isFullDay) - Number(!b.isFullDay);
    if (allDay !== 0) return allDay;
    const start = (a.startUtc ? Date.parse(a.startUtc) : 0) - (b.startUtc ? Date.parse(b.startUtc) : 0);
    return start || a.title.localeCompare(b.title);
}

/** Occurrences rangées par jour local ; une occurrence sur plusieurs jours figure dans chacun. */
export function groupByDay(items: readonly CalendarOccurrence[]): Map<string, CalendarOccurrence[]> {
    const map = new Map<string, CalendarOccurrence[]>();
    for (const occurrence of items) {
        for (const day of occurrenceDays(occurrence)) {
            const list = map.get(day) ?? [];
            list.push(occurrence);
            map.set(day, list);
        }
    }
    for (const list of map.values()) list.sort(compareOccurrences);
    return map;
}

export type MonthSummary = {
    /** Devise la plus fréquente parmi les montants du mois ; null sans montant. */
    currency: string | null;
    inflows: number;
    outflows: number;
    balance: number;
    /** Devises présentes mais non comptées dans le bilan. */
    otherCurrencies: string[];
};

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Bilan des montants dont le premier jour tombe dans le mois `yyyy-MM`, dans la devise dominante.
 * Une occurrence annulée ne compte pas.
 */
export function monthSummary(items: readonly CalendarOccurrence[], monthPrefix: string): MonthSummary {
    const counted = items.filter(
        (o) => o.amount != null && o.currency && !isCanceled(o) && (occurrenceDays(o)[0] ?? '').startsWith(monthPrefix)
    );
    const frequency = new Map<string, number>();
    for (const o of counted) frequency.set(o.currency!, (frequency.get(o.currency!) ?? 0) + 1);
    const currency = [...frequency.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    let inflows = 0;
    let outflows = 0;
    for (const o of counted) {
        if (o.currency !== currency) continue;
        if (o.amount! > 0) inflows += o.amount!;
        else outflows += o.amount!;
    }
    return {
        currency,
        inflows: round2(inflows),
        outflows: round2(outflows),
        balance: round2(inflows + outflows),
        otherCurrencies: [...frequency.keys()].filter((c) => c !== currency).sort()
    };
}

/** Prochaines sorties issues des sources, de `fromYmd` inclus à `beforeYmd` exclu. */
export function upcomingOutflows(
    items: readonly CalendarOccurrence[],
    fromYmd: string,
    beforeYmd: string,
    limit = 3
): CalendarOccurrence[] {
    return items
        .filter((o) => {
            const day = occurrenceDays(o)[0] ?? '';
            return o.sourceKey && (o.amount ?? 0) < 0 && !isCanceled(o) && day >= fromYmd && day < beforeYmd;
        })
        .sort((a, b) => (occurrenceDays(a)[0] ?? '').localeCompare(occurrenceDays(b)[0] ?? '') || compareOccurrences(a, b))
        .slice(0, limit);
}

/** Montant suisse avec devise ; `signed` préfixe `+` ou `−`. */
export function formatOccurrenceAmount(amount: number, currency: string, signed = true): string {
    const formatted = `${formatSwissNumber(Math.abs(amount))} ${currency}`;
    if (!signed) return formatted;
    return `${amount < 0 ? '−' : '+'}${formatted}`;
}

/** Heure de début locale (`HH:mm` selon la langue) ; null pour une journée entière. */
export function occurrenceTime(occurrence: CalendarOccurrence, locale: string): string | null {
    if (occurrence.isFullDay || !occurrence.startUtc) return null;
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(occurrence.startUtc));
}
