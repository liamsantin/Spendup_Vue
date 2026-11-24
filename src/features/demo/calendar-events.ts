/**
 * Événements saisis de la démo : stockage en mémoire, dépliage des répétitions et modifications par portée,
 * au plus près de `/api/calendar-events`. Heures dans le fuseau du navigateur. Module sans dépendance à `db.ts`
 * (qui l'appelle pendant son initialisation) : les fonctions reçoivent la liste à modifier.
 */
import { addDaysYmd, occurrenceDays, parseYmd, toYmd, ymdOf } from '@/features/calendar/dates';
import type {
    CalendarEvent,
    CalendarEventScope,
    CalendarInfo,
    CalendarOccurrence,
    CalendarReminder,
    CreateCalendarEventPayload,
    UpdateCalendarEventPayload
} from '@/features/calendar/types';
import { AppError } from '@/utils/errors/app-error';

export const DEMO_CALENDAR: CalendarInfo = {
    publicId: 'DEMOCAL',
    name: 'Personnel',
    description: null,
    calendarType: 'personnel',
    color: null,
    timezone: null,
    isOwner: true,
    permission: 'manage',
    isHidden: false
};

type Override = {
    cancelled?: boolean;
    title?: string;
    description?: string | null;
    lieu?: string | null;
    startUtc?: string;
    endUtc?: string;
    startDate?: string;
    endDate?: string;
};

/** Événement stocké : la réponse de l'API plus ses exceptions, par début d'origine. */
export type DemoCalendarEvent = CalendarEvent & { exceptions: Record<string, Override> };

const MAX_ITERATIONS = 5000;
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function browserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich';
}

function event(id: string, rest: Partial<CalendarEvent>): DemoCalendarEvent {
    return {
        publicId: id,
        calendarPublicId: DEMO_CALENDAR.publicId,
        title: '',
        description: null,
        lieu: null,
        isFullDay: false,
        startUtc: null,
        endUtc: null,
        timezone: null,
        startDate: null,
        endDate: null,
        recurrenceRule: null,
        visibilite: 'prive',
        status: 'planifie',
        reminders: [],
        rowVersion: 1,
        exceptions: {},
        ...rest
    };
}

/** Rendez-vous, séjour et cours hebdomadaire autour du mois `month` (0 = janvier). */
export function seedDemoCalendarEvents(year: number, month: number): DemoCalendarEvent[] {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dentist = new Date(year, month, Math.min(9, lastDay), 10, 0);
    const trip = toYmd(year, month, Math.min(20, lastDay));
    const swimStart = new Date(year, month - 2, 1, 18, 30);
    swimStart.setDate(1 + ((3 - swimStart.getDay() + 7) % 7));
    const timed = (start: Date, minutes: number) => ({
        startUtc: start.toISOString(),
        endUtc: new Date(start.getTime() + minutes * 60_000).toISOString(),
        timezone: browserTimezone()
    });
    return [
        event('DEMOEVTDENT', {
            title: 'Dentiste',
            lieu: 'Cabinet du Dr Rochat, Lausanne',
            ...timed(dentist, 45),
            reminders: [{ beforeMinutes: 1440, canal: 'app' }]
        }),
        event('DEMOEVTTESS', { title: 'Week-end au Tessin', isFullDay: true, startDate: trip, endDate: addDaysYmd(trip, 2) }),
        event('DEMOEVTSWIM', {
            title: 'Cours de natation',
            lieu: 'Piscine de Mon-Repos',
            ...timed(swimStart, 60),
            recurrenceRule: 'FREQ=WEEKLY',
            reminders: [{ beforeMinutes: 30, canal: 'app' }]
        })
    ];
}

function ruleParts(rule: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const part of rule.split(';')) {
        const [key, value] = part.split('=');
        if (key && value) map.set(key.toUpperCase(), value.toUpperCase());
    }
    return map;
}

function utcStamp(instant: Date): string {
    return (
        `${instant.getUTCFullYear()}${pad(instant.getUTCMonth() + 1)}${pad(instant.getUTCDate())}` +
        `T${pad(instant.getUTCHours())}${pad(instant.getUTCMinutes())}${pad(instant.getUTCSeconds())}Z`
    );
}

/** Dernier début permis par `UNTIL` (date seule = fin de ce jour local). */
function untilLimit(until: string): Date | null {
    const date = /^(\d{4})(\d{2})(\d{2})$/.exec(until);
    if (date) return new Date(+date[1], +date[2] - 1, +date[3], 23, 59, 59);
    const utc = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(until);
    return utc ? new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6])) : null;
}

function seriesStart(evt: CalendarEvent): Date {
    return evt.isFullDay ? parseYmd(evt.startDate!) : new Date(evt.startUtc!);
}

/** Débuts successifs de la série (heure locale conservée d'une occurrence à l'autre). */
function* starts(evt: CalendarEvent): Generator<Date> {
    const first = seriesStart(evt);
    if (!evt.recurrenceRule) {
        yield first;
        return;
    }
    const rule = ruleParts(evt.recurrenceRule);
    const interval = Math.max(1, Number(rule.get('INTERVAL') ?? 1));
    const freq = rule.get('FREQ');
    const byDay = rule.get('BYDAY')?.split(',');
    const at = (base: Date, days: number, months = 0) =>
        new Date(base.getFullYear(), base.getMonth() + months, base.getDate() + days, base.getHours(), base.getMinutes());

    for (let k = 0; k < MAX_ITERATIONS; k += 1) {
        if (freq === 'DAILY') yield at(first, k * interval);
        else if (freq === 'WEEKLY' && byDay?.length) {
            const monday = at(first, -((first.getDay() + 6) % 7) + 7 * k * interval);
            for (const code of BYDAY) {
                const day = at(monday, BYDAY.indexOf(code));
                if (byDay.includes(code) && day >= first) yield day;
            }
        } else if (freq === 'WEEKLY') yield at(first, 7 * k * interval);
        else if (freq === 'MONTHLY' || freq === 'YEARLY') {
            const next = at(first, 0, k * interval * (freq === 'YEARLY' ? 12 : 1));
            if (next.getDate() === first.getDate()) yield next;
        } else return;
    }
}

function originalKey(evt: CalendarEvent, start: Date): string {
    return evt.isFullDay ? `${ymdOf(start)}T00:00:00Z` : `${start.toISOString().slice(0, 19)}Z`;
}

/** Occurrences de l'événement qui touchent [from, to] (dates incluses). */
export function expandDemoEvent(evt: DemoCalendarEvent, from: string, to: string): CalendarOccurrence[] {
    const rule = evt.recurrenceRule ? ruleParts(evt.recurrenceRule) : null;
    const count = rule?.get('COUNT') ? Number(rule.get('COUNT')) : null;
    const until = rule?.get('UNTIL') ? untilLimit(rule.get('UNTIL')!) : null;
    const spanDays = evt.isFullDay
        ? Math.round((parseYmd(evt.endDate ?? evt.startDate!).getTime() - seriesStart(evt).getTime()) / 86_400_000)
        : 0;
    const durationMs = evt.isFullDay ? 0 : Date.parse(evt.endUtc ?? evt.startUtc!) - Date.parse(evt.startUtc!);

    const items: CalendarOccurrence[] = [];
    let n = 0;
    for (const start of starts(evt)) {
        n += 1;
        if (count != null && n > count) break;
        if (until && start > until) break;
        if (ymdOf(start) > to) break;
        const key = originalKey(evt, start);
        const override = evt.exceptions[key];
        if (override?.cancelled) continue;
        const startDate = evt.isFullDay ? ymdOf(start) : null;
        const occurrence: CalendarOccurrence = {
            id: `${evt.publicId}:${key}`,
            sourceKey: null,
            eventPublicId: evt.publicId,
            entityPublicId: null,
            title: override?.title ?? evt.title,
            isFullDay: evt.isFullDay,
            startUtc: evt.isFullDay ? null : (override?.startUtc ?? start.toISOString()),
            endUtc: evt.isFullDay ? null : (override?.endUtc ?? new Date(start.getTime() + durationMs).toISOString()),
            startDate: evt.isFullDay ? (override?.startDate ?? startDate) : null,
            endDate: evt.isFullDay ? (override?.endDate ?? addDaysYmd(startDate!, spanDays)) : null,
            amount: null,
            currency: null,
            status: null,
            color: null,
            isRecurring: !!evt.recurrenceRule,
            isModified: !!override,
            sharedBy: null
        };
        if (occurrenceDays(occurrence).some((day) => day >= from && day <= to)) items.push(occurrence);
    }
    return items;
}

export function toEventResponse(evt: DemoCalendarEvent): CalendarEvent {
    const response: CalendarEvent & { exceptions?: unknown } = { ...evt, reminders: evt.reminders.map((r) => ({ ...r })) };
    delete response.exceptions;
    return response;
}

export function findDemoEvent(events: DemoCalendarEvent[], publicId: string): DemoCalendarEvent {
    const evt = events.find((item) => item.publicId === publicId);
    if (!evt) throw new AppError('Événement introuvable.', 404);
    return evt;
}

function requireTitle(title: string | undefined): string {
    const value = title?.trim();
    if (!value) throw new AppError("Le titre de l'événement est obligatoire.", 400);
    return value;
}

function cleanReminders(reminders: CalendarReminder[]): CalendarReminder[] {
    if (reminders.length > 5) throw new AppError('Au plus 5 rappels par événement.', 400);
    return reminders.map((r) => ({ beforeMinutes: r.beforeMinutes, canal: r.canal.toLowerCase() }));
}

function emptyToNull(value: string | undefined | null): string | null {
    return value?.trim() ? value.trim() : null;
}

export function createDemoEvent(events: DemoCalendarEvent[], body: CreateCalendarEventPayload, publicId: string): CalendarEvent {
    if (body.isFullDay ? !body.startDate : !body.startUtc) throw new AppError('Le début est obligatoire.', 400);
    const created = event(publicId, {
        title: requireTitle(body.title),
        description: emptyToNull(body.description),
        lieu: emptyToNull(body.lieu),
        isFullDay: body.isFullDay,
        startUtc: body.isFullDay ? null : body.startUtc!,
        endUtc: body.isFullDay ? null : (body.endUtc ?? new Date(Date.parse(body.startUtc!) + 3_600_000).toISOString()),
        timezone: body.isFullDay ? null : (body.timezone ?? browserTimezone()),
        startDate: body.isFullDay ? body.startDate! : null,
        endDate: body.isFullDay ? (body.endDate ?? body.startDate!) : null,
        recurrenceRule: emptyToNull(body.recurrenceRule),
        reminders: cleanReminders(body.reminders ?? [])
    });
    events.push(created);
    return toEventResponse(created);
}

function ensureVersion(evt: DemoCalendarEvent, rowVersion: number) {
    if (evt.rowVersion !== rowVersion) throw new AppError("L'événement a été modifié entre-temps ; rechargez-le.", 409);
}

function requireRecurring(evt: DemoCalendarEvent) {
    if (!evt.recurrenceRule) throw new AppError("L'événement n'est pas récurrent : utilisez la portée « series ».", 400);
}

function isFirst(evt: DemoCalendarEvent, occurrenceStart: string): boolean {
    return originalKey(evt, seriesStart(evt)) === occurrenceStart;
}

function stripLimits(rule: string): string {
    return rule
        .split(';')
        .filter((part) => !/^(COUNT|UNTIL)=/i.test(part))
        .join(';');
}

/** Règle arrêtée juste avant l'occurrence `occurrenceStart`. */
function untilBefore(evt: DemoCalendarEvent, occurrenceStart: string): string {
    const until = evt.isFullDay
        ? addDaysYmd(occurrenceStart.slice(0, 10), -1).replaceAll('-', '')
        : utcStamp(new Date(Date.parse(occurrenceStart) - 1000));
    return `${stripLimits(evt.recurrenceRule!)};UNTIL=${until}`;
}

function applySeries(evt: DemoCalendarEvent, body: UpdateCalendarEventPayload) {
    if (body.title !== undefined) evt.title = requireTitle(body.title);
    if (body.description !== undefined) evt.description = emptyToNull(body.description);
    if (body.lieu !== undefined) evt.lieu = emptyToNull(body.lieu);
    if (body.recurrenceRule !== undefined) evt.recurrenceRule = emptyToNull(body.recurrenceRule);
    if (evt.isFullDay) {
        evt.startDate = body.startDate ?? evt.startDate;
        evt.endDate = body.endDate ?? evt.endDate;
    } else {
        evt.startUtc = body.startUtc ?? evt.startUtc;
        evt.endUtc = body.endUtc ?? evt.endUtc;
        evt.timezone = body.timezone ?? evt.timezone;
    }
}

export function updateDemoEvent(
    events: DemoCalendarEvent[],
    publicId: string,
    body: UpdateCalendarEventPayload,
    newId: () => string
): CalendarEvent {
    const evt = findDemoEvent(events, publicId);
    ensureVersion(evt, body.rowVersion);
    const scope: CalendarEventScope = body.scope ?? 'series';
    let result = evt;

    if (scope === 'occurrence') {
        requireRecurring(evt);
        const key = body.occurrenceStart;
        if (!key) throw new AppError('occurrenceStart est obligatoire pour cette portée.', 400);
        const override = (evt.exceptions[key] ??= {});
        override.cancelled = false;
        if (body.title !== undefined) override.title = requireTitle(body.title);
        if (body.description !== undefined) override.description = emptyToNull(body.description);
        if (body.lieu !== undefined) override.lieu = emptyToNull(body.lieu);
        if (body.startUtc) override.startUtc = body.startUtc;
        if (body.endUtc) override.endUtc = body.endUtc;
        if (body.startDate) override.startDate = body.startDate;
        if (body.endDate) override.endDate = body.endDate;
    } else if (scope === 'following' && body.occurrenceStart && !isFirst(evt, body.occurrenceStart)) {
        requireRecurring(evt);
        const from = body.occurrenceStart;
        const next: DemoCalendarEvent = { ...toEventResponse(evt), publicId: newId(), rowVersion: 1, exceptions: {} };
        if (evt.isFullDay) {
            const span = Math.round((parseYmd(evt.endDate ?? evt.startDate!).getTime() - parseYmd(evt.startDate!).getTime()) / 86_400_000);
            next.startDate = body.startDate ?? from.slice(0, 10);
            next.endDate = body.endDate ?? addDaysYmd(next.startDate, span);
        } else {
            const duration = Date.parse(evt.endUtc ?? evt.startUtc!) - Date.parse(evt.startUtc!);
            next.startUtc = body.startUtc ?? new Date(Date.parse(from)).toISOString();
            next.endUtc = body.endUtc ?? new Date(Date.parse(next.startUtc) + duration).toISOString();
            next.timezone = body.timezone ?? evt.timezone;
        }
        next.recurrenceRule =
            body.recurrenceRule === undefined
                ? evt
                      .recurrenceRule!.split(';')
                      .filter((part) => !/^COUNT=/i.test(part))
                      .join(';')
                : emptyToNull(body.recurrenceRule);
        if (body.title !== undefined) next.title = requireTitle(body.title);
        if (body.description !== undefined) next.description = emptyToNull(body.description);
        if (body.lieu !== undefined) next.lieu = emptyToNull(body.lieu);
        for (const key of Object.keys(evt.exceptions).filter((key) => key >= from)) {
            next.exceptions[key] = evt.exceptions[key];
            delete evt.exceptions[key];
        }
        evt.recurrenceRule = untilBefore(evt, from);
        events.push(next);
        result = next;
    } else {
        applySeries(evt, body);
    }

    if (body.reminders) result.reminders = cleanReminders(body.reminders);
    evt.rowVersion += 1;
    return toEventResponse(result);
}

export function deleteDemoEvent(
    events: DemoCalendarEvent[],
    publicId: string,
    rowVersion: number,
    scope: string | null,
    occurrenceStart: string | null
): void {
    const evt = findDemoEvent(events, publicId);
    ensureVersion(evt, rowVersion);
    const removeSeries = () => events.splice(events.indexOf(evt), 1);
    if (!scope || scope === 'series') {
        removeSeries();
        return;
    }
    requireRecurring(evt);
    if (!occurrenceStart) throw new AppError('occurrenceStart est obligatoire pour cette portée.', 400);
    if (scope === 'following') {
        if (isFirst(evt, occurrenceStart)) removeSeries();
        else evt.recurrenceRule = untilBefore(evt, occurrenceStart);
    } else {
        evt.exceptions[occurrenceStart] = { ...evt.exceptions[occurrenceStart], cancelled: true };
    }
    evt.rowVersion += 1;
}
