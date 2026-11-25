/** Sources financières projetées par l'API (`ICalendarSourceProvider`). */
export const CALENDAR_SOURCE_KEYS = [
    'recurringExpense',
    'recurringIncome',
    'savingsGoal',
    'sharedDebt',
    'personalLoan',
    'liability',
    'taxInstallment',
    'realEstate',
    'budget',
    'transactions'
] as const;

export type CalendarSourceKey = (typeof CALENDAR_SOURCE_KEYS)[number];

/** Vues du calendrier, dans l'ordre des raccourcis `1` à `4`. */
export const CALENDAR_VIEWS = ['day', 'week', 'month', 'agenda'] as const;

export type CalendarViewMode = (typeof CALENDAR_VIEWS)[number];

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
    /** Présent sur l'occurrence d'un événement ancré ouvert depuis une source : sert à libérer l'ancrage resté vide. */
    anchoredFrom?: { sourceKey: string; entityPublicId: string; date: string } | null;
};

export type CalendarOccurrencesResult = {
    from: string;
    to: string;
    items: CalendarOccurrence[];
};

/** Calendrier de l'utilisateur (`GET /api/calendars`). `permission` : freeBusy, read, write, manage. */
export type CalendarInfo = {
    publicId: string;
    name: string;
    description: string | null;
    calendarType: string;
    color: string | null;
    timezone: string | null;
    isOwner: boolean;
    permission: string;
    isHidden: boolean;
};

/** Réglages généraux (`GET /api/calendar/preferences`). Groupes Affichage, Création, Fuseau. */
export type CalendarPreferences = {
    defaultView: string;
    weekStartsOn: number;
    showWeekends: boolean;
    showWeekNumbers: boolean;
    use24HourClock: boolean;
    dayStartHour: number;
    dayEndHour: number;
    defaultCalendarId: string | null;
    defaultDurationMinutes: number;
    defaultVisibilite: string;
    defaultReminderMinutes: number | null;
    timezone: string;
    secondTimezone: string | null;
    /** Mode discret : le serveur n'envoie aucun montant. */
    discreetMode: boolean;
    /** Affiche le solde projeté sous chaque jour du mois. */
    showProjectedBalance?: boolean;
    /** Compte (publicId) sur lequel porte le solde projeté ; null : tous les comptes. */
    referenceAccountId?: string | null;
};

/** Modification partielle. Chaîne vide pour `defaultCalendarId` ou `secondTimezone` : effacer. */
export type UpdateCalendarPreferencesPayload = {
    defaultView?: string;
    weekStartsOn?: number;
    showWeekends?: boolean;
    showWeekNumbers?: boolean;
    use24HourClock?: boolean;
    dayStartHour?: number;
    dayEndHour?: number;
    defaultCalendarId?: string;
    defaultDurationMinutes?: number;
    defaultVisibilite?: string;
    defaultReminderMinutes?: number;
    clearDefaultReminder?: boolean;
    timezone?: string;
    secondTimezone?: string;
    discreetMode?: boolean;
    showProjectedBalance?: boolean;
    /** Chaîne vide : tous les comptes. */
    referenceAccountId?: string;
};

/** Solde projeté à la fin d'un jour (`GET /api/calendar/forecast`). */
export type CalendarForecastDay = { date: string; balance: number; delta: number; atRisk: boolean };

export type CalendarForecast = {
    currency: string | null;
    startBalance: number;
    minBalance: number | null;
    firstRiskDate: string | null;
    discreet: boolean;
    days: CalendarForecastDay[];
};

export type CalendarReminder = { beforeMinutes: number; canal: string };

/**
 * Événement saisi (`/api/calendar-events/{publicId}`). Horaire : `startUtc` / `endUtc` + `timezone` ;
 * journée entière : `startDate` / `endDate` (inclusives). `recurrenceRule` : RRULE sans préfixe.
 */
export type CalendarEvent = {
    publicId: string;
    calendarPublicId: string;
    title: string;
    description: string | null;
    lieu: string | null;
    isFullDay: boolean;
    startUtc: string | null;
    endUtc: string | null;
    timezone: string | null;
    startDate: string | null;
    endDate: string | null;
    recurrenceRule: string | null;
    visibilite: string;
    status: string;
    reminders: CalendarReminder[];
    rowVersion: number;
};

export type CreateCalendarEventPayload = {
    calendarPublicId: string | null;
    title: string;
    isFullDay: boolean;
    startUtc?: string;
    endUtc?: string;
    timezone?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    lieu?: string;
    recurrenceRule?: string;
    /** Absent : rappel par défaut des réglages ; `[]` : aucun rappel. */
    reminders?: CalendarReminder[];
};

/** Portée d'une modification ou d'une suppression sur un événement récurrent. */
export type CalendarEventScope = 'series' | 'occurrence' | 'following';

/** Modification partielle : champs absents inchangés, chaîne vide = effacer (description, lieu, règle). */
export type UpdateCalendarEventPayload = {
    rowVersion: number;
    title?: string;
    description?: string;
    lieu?: string;
    startUtc?: string;
    endUtc?: string;
    timezone?: string;
    startDate?: string;
    endDate?: string;
    recurrenceRule?: string;
    reminders?: CalendarReminder[];
    scope: CalendarEventScope;
    occurrenceStart?: string;
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

export const CALENDAR_DISPLAY_MODES = ['detailed', 'dailyTotal', 'markerOnly'] as const;
export type CalendarDisplayMode = (typeof CALENDAR_DISPLAY_MODES)[number];
export const CALENDAR_PROFILES = ['minimal', 'equilibre', 'complet'] as const;
export type CalendarProfile = (typeof CALENDAR_PROFILES)[number];

/** Réglage effectif d'une source (`GET /api/calendar/sources`). */
export type CalendarSourceSetting = {
    key: string;
    label: string;
    color: string;
    isEnabled: boolean;
    displayMode: CalendarDisplayMode;
    minAmount: number | null;
    /** Réglé à la main (différent des valeurs du profil). */
    isCustom: boolean;
    includeInFeed: boolean;
    shareWithFamily: boolean;
    /** Minutes avant 08:00 le jour de l'échéance ; null = aucun rappel. */
    reminderMinutes?: number | null;
};

/** `profileChosen` : faux tant que l'utilisateur n'a jamais choisi de profil (absent en mode démo). */
export type CalendarSourceList = { profile: CalendarProfile; items: CalendarSourceSetting[]; profileChosen?: boolean };

export type UpdateCalendarSourcePayload = {
    isEnabled?: boolean;
    displayMode?: CalendarDisplayMode;
    minAmount?: number;
    clearMinAmount?: boolean;
    reminderMinutes?: number;
    clearReminder?: boolean;
};

/** Élément d'une source masqué par l'utilisateur (`GET /api/calendar/exclusions`). */
export type CalendarSourceExclusion = { sourceKey: string; entityPublicId: string; label: string };

export const CALENDAR_BUDGET_TYPES = ['vacances', 'demenagement', 'naissance', 'mariage', 'achatImportant', 'projet', 'other'] as const;
export type CalendarBudgetType = (typeof CALENDAR_BUDGET_TYPES)[number];

/** Transaction rattachée ou suggérée ; montant positif pour une dépense, négatif pour un remboursement. */
export type CalendarBudgetTransaction = {
    publicId: string;
    label: string;
    operationDate: string;
    amount: number;
    currency: string;
    transactionType: string;
};

/** Prévu / réel d'un événement (`GET /api/calendar-events/{id}/budget`). */
export type CalendarEventBudget = {
    eventType: string;
    plannedBudget: number;
    currency: string;
    notes: string | null;
    spent: number;
    remaining: number;
    percent: number | null;
    exceeded: boolean;
    transactions: CalendarBudgetTransaction[];
};

export type SetCalendarEventBudgetPayload = { eventType: string; plannedBudget: number; currency?: string; notes?: string };
