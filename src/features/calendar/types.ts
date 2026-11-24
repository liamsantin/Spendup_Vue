/** Sources financières projetées par l'API (`ICalendarSourceProvider`). */
export const CALENDAR_SOURCE_KEYS = [
    'recurringExpense',
    'recurringIncome',
    'savingsGoal',
    'sharedDebt',
    'personalLoan',
    'liability'
] as const;

export type CalendarSourceKey = (typeof CALENDAR_SOURCE_KEYS)[number];

/** Famille visuelle d'une occurrence : événement saisi ou nature de la source. */
export type CalendarTone = 'event' | 'income' | 'expense' | 'due' | 'goal';

/**
 * Occurrence affichable (`GET /api/calendar/occurrences`) : événement saisi déplié ou occurrence virtuelle d'une source.
 * Horaire : `startUtc` / `endUtc` (ISO avec décalage). Journée entière : `startDate` / `endDate` (`yyyy-MM-dd`, inclusives).
 */
export type CalendarOccurrence = {
    /** Événement : `{publicId}:{début d'origine}` ; source : `{source}:{entité}:{date}`. */
    id: string;
    /** Null pour un événement saisi. */
    sourceKey: string | null;
    eventPublicId: string | null;
    entityPublicId: string | null;
    title: string;
    isFullDay: boolean;
    startUtc: string | null;
    endUtc: string | null;
    startDate: string | null;
    endDate: string | null;
    /** Signé : négatif = sortie. Null en mode discret ou sans montant. */
    amount: number | null;
    currency: string | null;
    /** Ex. `annule` pour un événement annulé gardé chez l'invité. */
    status: string | null;
    color: string | null;
    isRecurring: boolean;
    isModified: boolean;
    /** Membre de la famille qui partage la source ; null pour ses propres éléments. */
    sharedBy?: string | null;
};

export type CalendarOccurrencesResult = {
    from: string;
    to: string;
    items: CalendarOccurrence[];
};

export type CalendarOccurrencesQuery = {
    /** `yyyy-MM-dd`, inclus. */
    from: string;
    /** `yyyy-MM-dd`, inclus. */
    to: string;
    q?: string;
    /** Couches séparées par des virgules (`events`, clés de source) ; absent = toutes les couches activées. */
    layers?: string;
};
