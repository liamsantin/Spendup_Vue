import { occurrenceDays, parseYmd, toYmd } from '@/features/calendar/dates';
import type {
    CalendarSourceExclusion,
    CalendarProfile,
    CalendarSourceSetting,
    UpdateCalendarSourcePayload,
    CalendarOccurrence,
    CalendarOccurrencesResult,
    CreateCalendarEventPayload,
    UpdateCalendarEventPayload,
    UpdateCalendarPreferencesPayload
} from '@/features/calendar/types';
import {
    DEMO_CALENDAR,
    createDemoEvent,
    deleteDemoEvent,
    expandDemoEvent,
    findDemoEvent,
    toEventResponse,
    updateDemoEvent
} from '@/features/demo/calendar-events';
import { createPublicId, demoDb } from '@/features/demo/db';
import { AppError } from '@/utils/errors/app-error';

export type CalendarEventKind = 'income' | 'expense' | 'due' | 'goal';

/** Écriture ou échéance du foyer d'exemple, avant conversion au format de l'API. */
export type CalendarEvent = {
    id: string;
    /** Date calendaire `yyyy-MM-dd`. */
    date: string;
    title: string;
    kind: CalendarEventKind;
    /** Signé : négatif = sortie. */
    amount: number;
    account: string;
    note?: string;
};

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
        const date = toYmd(year, month, day);
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

const KIND_SOURCES: Record<CalendarEventKind, string> = {
    income: 'recurringIncome',
    expense: 'recurringExpense',
    goal: 'savingsGoal',
    due: 'liability'
};

function toOccurrence(event: CalendarEvent): CalendarOccurrence {
    const sourceKey = KIND_SOURCES[event.kind];
    return {
        id: `${sourceKey}:${event.id}:${event.date}`,
        sourceKey,
        eventPublicId: null,
        entityPublicId: event.id,
        title: event.title,
        isFullDay: true,
        startUtc: null,
        endUtc: null,
        startDate: event.date,
        endDate: event.date,
        amount: event.amount,
        currency: 'CHF',
        status: null,
        color: null,
        isRecurring: false,
        isModified: false,
        sharedBy: null
    };
}

/** Occurrences de la fenêtre `from`–`to` (incluses), au format de `GET /api/calendar/occurrences`. */
export function demoOccurrences(from: string, to: string): CalendarOccurrencesResult {
    const items: CalendarOccurrence[] = [];
    const cursor = parseYmd(from);
    cursor.setDate(1);
    const end = parseYmd(to);
    while (cursor <= end) {
        items.push(...demoEventsForMonth(cursor.getFullYear(), cursor.getMonth()).map(toOccurrence));
        cursor.setMonth(cursor.getMonth() + 1);
    }
    const sources = items.filter((o) => occurrenceDays(o).some((day) => day >= from && day <= to));
    const agenda = demoDb().calendarEvents.flatMap((evt) => expandDemoEvent(evt, from, to));
    const hidden = demoExclusions();
    const visible = sources.filter((o) => !hidden.some((x) => x.sourceKey === o.sourceKey && x.entityPublicId === o.entityPublicId));
    const all = [...agenda, ...visible];
    // Mode discret : comme l'API, aucun montant n'est renvoyé.
    return { from, to, items: demoPreferences().discreetMode ? all.map((o) => ({ ...o, amount: null })) : all };
}

type DemoPreferences = {
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
    /** Null : le fuseau du navigateur, tant que l'utilisateur n'en a pas choisi. */
    timezone: string | null;
    secondTimezone: string | null;
    eventInvitesFrom: string;
    autoAcceptFamilyInvites: boolean;
    showDeclinedEvents: boolean;
    discreetMode: boolean;
};

const DEFAULT_PREFERENCES: DemoPreferences = {
    defaultView: 'month',
    weekStartsOn: 1,
    showWeekends: true,
    showWeekNumbers: false,
    use24HourClock: true,
    dayStartHour: 7,
    dayEndHour: 22,
    defaultCalendarId: null,
    defaultDurationMinutes: 60,
    defaultVisibilite: 'prive',
    defaultReminderMinutes: 15,
    timezone: null,
    secondTimezone: null,
    eventInvitesFrom: 'friends',
    autoAcceptFamilyInvites: false,
    showDeclinedEvents: false,
    discreetMode: false
};

/** Une copie par base démo : réinitialiser la démo repart des valeurs d'origine. */
const preferencesByDb = new WeakMap<object, DemoPreferences>();

function demoPreferences(): DemoPreferences {
    const db = demoDb();
    const current = preferencesByDb.get(db);
    if (current) return current;
    const fresh = { ...DEFAULT_PREFERENCES };
    preferencesByDb.set(db, fresh);
    return fresh;
}

function preferencesBody(prefs: DemoPreferences) {
    return { ...prefs, timezone: prefs.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich') };
}

function applyDemoPreferences(prefs: DemoPreferences, patch: UpdateCalendarPreferencesPayload) {
    if (patch.defaultView) prefs.defaultView = patch.defaultView;
    if (patch.weekStartsOn != null) prefs.weekStartsOn = patch.weekStartsOn;
    if (patch.showWeekends != null) prefs.showWeekends = patch.showWeekends;
    if (patch.showWeekNumbers != null) prefs.showWeekNumbers = patch.showWeekNumbers;
    if (patch.use24HourClock != null) prefs.use24HourClock = patch.use24HourClock;
    if (patch.dayStartHour != null) prefs.dayStartHour = patch.dayStartHour;
    if (patch.dayEndHour != null) prefs.dayEndHour = patch.dayEndHour;
    if (patch.defaultCalendarId === '') prefs.defaultCalendarId = null;
    else if (patch.defaultCalendarId) prefs.defaultCalendarId = patch.defaultCalendarId;
    if (patch.defaultDurationMinutes != null) prefs.defaultDurationMinutes = patch.defaultDurationMinutes;
    if (patch.defaultVisibilite) prefs.defaultVisibilite = patch.defaultVisibilite;
    if (patch.clearDefaultReminder) prefs.defaultReminderMinutes = null;
    else if (patch.defaultReminderMinutes != null) prefs.defaultReminderMinutes = patch.defaultReminderMinutes;
    if (patch.timezone) prefs.timezone = patch.timezone;
    if (patch.secondTimezone === '') prefs.secondTimezone = null;
    else if (patch.secondTimezone) prefs.secondTimezone = patch.secondTimezone;
    if (patch.discreetMode != null) prefs.discreetMode = patch.discreetMode;
}

const DEMO_SOURCE_LABELS: Record<string, string> = {
    recurringExpense: 'Dépenses récurrentes',
    recurringIncome: 'Revenus récurrents',
    savingsGoal: "Objectifs d'épargne",
    sharedDebt: 'Dettes partagées',
    personalLoan: 'Prêts entre proches',
    liability: 'Dettes'
};

/** Une occurrence de source connue de la démo, pour nommer un élément masqué. */
function demoEntry(sourceKey: string, entityPublicId: string): CalendarOccurrence | null {
    const now = new Date();
    for (let delta = -1; delta <= 1; delta++) {
        const found = demoEventsForMonth(now.getFullYear(), now.getMonth() + delta)
            .map(toOccurrence)
            .find((o) => o.sourceKey === sourceKey && o.entityPublicId === entityPublicId);
        if (found) return found;
    }
    return null;
}

type DemoSources = { profile: CalendarProfile; items: CalendarSourceSetting[] };

function freshDemoSources(profile: CalendarProfile): DemoSources {
    const items = Object.entries(DEMO_SOURCE_LABELS).map(([key, label]) => ({
        key,
        label,
        color: '#64748b',
        isEnabled: profile !== 'minimal' || key === 'liability',
        displayMode: 'detailed' as const,
        minAmount: profile === 'equilibre' && key === 'recurringExpense' ? 50 : null,
        isCustom: false,
        includeInFeed: false,
        shareWithFamily: false
    }));
    return { profile, items };
}

const sourcesByDb = new WeakMap<object, DemoSources>();

function demoSources(): DemoSources {
    const db = demoDb();
    const current = sourcesByDb.get(db);
    if (current) return current;
    const fresh = freshDemoSources('equilibre');
    sourcesByDb.set(db, fresh);
    return fresh;
}

const exclusionsByDb = new WeakMap<object, CalendarSourceExclusion[]>();

function demoExclusions(): CalendarSourceExclusion[] {
    const db = demoDb();
    const current = exclusionsByDb.get(db);
    if (current) return current;
    const fresh: CalendarSourceExclusion[] = [];
    exclusionsByDb.set(db, fresh);
    return fresh;
}

type Result = { status: number; body: unknown };

/** Routes calendrier du mode démo : occurrences, calendrier « Personnel » et événements saisis ; le reste demande un compte. */
export function routeCalendar(method: string, path: string, query: URLSearchParams, body?: unknown): Result | null {
    if (!path.startsWith('/api/calendar')) return null;
    const events = demoDb().calendarEvents;
    if (path === '/api/calendar/occurrences' && method === 'GET') {
        const from = query.get('from');
        const to = query.get('to');
        if (!from || !to || from > to) throw new AppError('Fenêtre de dates invalide.', 400);
        return { status: 200, body: demoOccurrences(from, to) };
    }
    if (path === '/api/calendars' && method === 'GET') return { status: 200, body: { items: [DEMO_CALENDAR] } };
    if (path === '/api/calendar/preferences' && method === 'GET') {
        return { status: 200, body: preferencesBody(demoPreferences()) };
    }
    if (path === '/api/calendar/preferences' && method === 'PATCH') {
        const prefs = demoPreferences();
        applyDemoPreferences(prefs, (body ?? {}) as UpdateCalendarPreferencesPayload);
        return { status: 200, body: preferencesBody(prefs) };
    }
    if (path === '/api/calendar/sources' && method === 'GET') return { status: 200, body: demoSources() };
    if (path === '/api/calendar/sources/profile' && method === 'PUT') {
        const profile = (body as { profile?: string } | undefined)?.profile;
        if (profile !== 'minimal' && profile !== 'equilibre' && profile !== 'complet') throw new AppError('Profil invalide.', 400);
        const fresh = freshDemoSources(profile);
        sourcesByDb.set(demoDb(), fresh);
        return { status: 200, body: fresh };
    }
    const sourceKey = /^\/api\/calendar\/sources\/([^/]+)$/.exec(path)?.[1];
    if (sourceKey && method === 'PATCH') {
        const source = demoSources().items.find((item) => item.key === decodeURIComponent(sourceKey));
        if (!source) throw new AppError('Source inconnue.', 404);
        const patch = (body ?? {}) as UpdateCalendarSourcePayload;
        if (patch.isEnabled != null) source.isEnabled = patch.isEnabled;
        if (patch.displayMode) source.displayMode = patch.displayMode;
        if (patch.clearMinAmount) source.minAmount = null;
        else if (patch.minAmount != null) source.minAmount = patch.minAmount;
        source.isCustom = true;
        return { status: 200, body: source };
    }
    if (path === '/api/calendar/exclusions' && method === 'GET') return { status: 200, body: { items: demoExclusions() } };
    if (path === '/api/calendar/exclusions' && method === 'POST') {
        const { sourceKey, entityPublicId } = (body ?? {}) as { sourceKey?: string; entityPublicId?: string };
        const found = sourceKey && entityPublicId ? demoEntry(sourceKey, entityPublicId) : null;
        if (!sourceKey || !entityPublicId || !found) throw new AppError('Élément introuvable.', 404);
        const list = demoExclusions();
        const existing = list.find((x) => x.sourceKey === sourceKey && x.entityPublicId === entityPublicId);
        if (existing) return { status: 200, body: existing };
        const created = { sourceKey, entityPublicId, label: found.title };
        list.push(created);
        return { status: 200, body: created };
    }
    const exclusion = /^\/api\/calendar\/exclusions\/([^/]+)\/([^/]+)$/.exec(path);
    if (exclusion && method === 'DELETE') {
        const list = demoExclusions();
        const index = list.findIndex(
            (x) => x.sourceKey === decodeURIComponent(exclusion[1] ?? '') && x.entityPublicId === decodeURIComponent(exclusion[2] ?? '')
        );
        if (index < 0) throw new AppError('Élément introuvable.', 404);
        list.splice(index, 1);
        return { status: 204, body: undefined };
    }
    if (path === '/api/calendar-events' && method === 'POST') {
        const payload = body as CreateCalendarEventPayload;
        const reminder = demoPreferences().defaultReminderMinutes;
        const reminders = payload.reminders ?? (reminder == null ? [] : [{ beforeMinutes: reminder, canal: 'app' }]);
        return { status: 200, body: createDemoEvent(events, { ...payload, reminders }, createPublicId()) };
    }
    const id = /^\/api\/calendar-events\/([^/]+)$/.exec(path)?.[1];
    if (id && method === 'GET') return { status: 200, body: toEventResponse(findDemoEvent(events, decodeURIComponent(id))) };
    if (id && method === 'PATCH') {
        return { status: 200, body: updateDemoEvent(events, decodeURIComponent(id), body as UpdateCalendarEventPayload, createPublicId) };
    }
    if (id && method === 'DELETE') {
        deleteDemoEvent(events, decodeURIComponent(id), Number(query.get('rowVersion')), query.get('scope'), query.get('occurrenceStart'));
        return { status: 204, body: undefined };
    }
    throw new AppError('Disponible avec un compte.', 403);
}
