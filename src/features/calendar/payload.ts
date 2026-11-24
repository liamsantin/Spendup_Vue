/**
 * Formulaire d'événement ↔ requêtes `/api/calendar-events`. Les heures saisies sont celles du navigateur ;
 * elles partent en UTC avec le fuseau du navigateur.
 *
 * En modification, le formulaire montre l'occurrence ouverte (pas forcément le début de la série) et seuls
 * les champs changés partent. Portée `series` : un changement d'horaire décale toute la série d'autant.
 */
import { addDaysYmd, parseYmd, ymdOf } from '@/features/calendar/dates';
import { buildRepeat, parseRepeat, repeatChanged, type RepeatErrorCode, type RepeatFields } from '@/features/calendar/recurrence';
import type {
    CalendarEvent,
    CalendarEventScope,
    CalendarOccurrence,
    CalendarReminder,
    CreateCalendarEventPayload,
    UpdateCalendarEventPayload
} from '@/features/calendar/types';

export const EVENT_TITLE_MAX = 200;
export const EVENT_LIEU_MAX = 255;
export const EVENT_DESCRIPTION_MAX = 4000;
export const EVENT_REMINDERS_MAX = 5;

export type CalendarEventFormFields = RepeatFields & {
    title: string;
    calendarPublicId: string;
    isFullDay: boolean;
    startDate: string | null;
    /** `HH:mm`, heure locale. */
    startTime: string;
    endDate: string | null;
    endTime: string;
    lieu: string;
    description: string;
    reminders: CalendarReminder[];
};

export type CalendarEventPayloadErrorCode =
    | 'titleRequired'
    | 'titleTooLong'
    | 'startRequired'
    | 'timeInvalid'
    | 'endBeforeStart'
    | 'lieuTooLong'
    | 'descriptionTooLong'
    | 'tooManyReminders'
    | RepeatErrorCode;

export type CalendarEventPayloadFail = { ok: false; code: CalendarEventPayloadErrorCode; field: keyof CalendarEventFormFields };
type Result<T> = { ok: true; payload: T } | CalendarEventPayloadFail;

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function hhmmOf(date: Date): string {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isHhmm(value: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Instant UTC (ISO) d'une date et d'une heure locales. */
export function localToUtcIso(ymd: string, hhmm: string): string {
    const date = parseYmd(ymd);
    const [h, m] = hhmm.split(':').map(Number);
    date.setHours(h, m, 0, 0);
    return date.toISOString();
}

function dayDiff(from: string, to: string): number {
    return Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86_400_000);
}

export function browserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich';
}

/** Début d'origine de l'occurrence, tel qu'attendu par `occurrenceStart` (suffixe de l'identifiant). */
export function occurrenceStartOf(occurrence: CalendarOccurrence): string | null {
    const prefix = `${occurrence.eventPublicId}:`;
    return occurrence.eventPublicId && occurrence.id.startsWith(prefix) ? occurrence.id.slice(prefix.length) : null;
}

/** Nouvel événement le `ymd` donné : heure ronde suivante si c'est aujourd'hui, 9 h sinon. */
export function emptyEventFormFields(
    ymd: string,
    defaults: { calendarPublicId?: string; durationMinutes?: number; reminderMinutes?: number | null } = {},
    now: Date = new Date()
): CalendarEventFormFields {
    const start = parseYmd(ymd);
    if (ymd === ymdOf(now)) start.setHours(Math.min(now.getHours() + 1, 23), 0, 0, 0);
    else start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + (defaults.durationMinutes ?? 60) * 60_000);
    return {
        ...parseRepeat(null, null),
        title: '',
        calendarPublicId: defaults.calendarPublicId ?? '',
        isFullDay: false,
        startDate: ymd,
        startTime: hhmmOf(start),
        endDate: ymdOf(end),
        endTime: hhmmOf(end),
        lieu: '',
        description: '',
        reminders: defaults.reminderMinutes == null ? [] : [{ beforeMinutes: defaults.reminderMinutes, canal: 'app' }]
    };
}

/** Champs d'un événement, à la date de l'occurrence ouverte si elle est fournie. */
export function eventToFormFields(event: CalendarEvent, occurrence?: CalendarOccurrence | null): CalendarEventFormFields {
    const source = occurrence ?? event;
    const seriesStart = event.isFullDay ? event.startDate : event.startUtc ? ymdOf(new Date(event.startUtc)) : null;
    const base = {
        ...parseRepeat(event.recurrenceRule, seriesStart),
        title: event.title,
        calendarPublicId: event.calendarPublicId,
        isFullDay: event.isFullDay,
        lieu: event.lieu ?? '',
        description: event.description ?? '',
        reminders: event.reminders.map((r) => ({ ...r }))
    };
    if (event.isFullDay) {
        const startDate = source.startDate ?? event.startDate;
        return { ...base, startDate, startTime: '09:00', endDate: source.endDate ?? startDate, endTime: '10:00' };
    }
    const start = new Date(source.startUtc ?? event.startUtc ?? Date.now());
    const end = new Date(source.endUtc ?? source.startUtc ?? start.toISOString());
    return { ...base, startDate: ymdOf(start), startTime: hhmmOf(start), endDate: ymdOf(end), endTime: hhmmOf(end) };
}

type Timing = { startDate: string; endDate: string; startUtc: string | null; endUtc: string | null };

function validate(fields: CalendarEventFormFields): { ok: true; timing: Timing; rule: string | null } | CalendarEventPayloadFail {
    const title = fields.title.trim();
    if (!title) return { ok: false, code: 'titleRequired', field: 'title' };
    if (title.length > EVENT_TITLE_MAX) return { ok: false, code: 'titleTooLong', field: 'title' };
    if (!fields.startDate) return { ok: false, code: 'startRequired', field: 'startDate' };
    const endDate = fields.endDate || fields.startDate;

    let timing: Timing;
    if (fields.isFullDay) {
        if (endDate < fields.startDate) return { ok: false, code: 'endBeforeStart', field: 'endDate' };
        timing = { startDate: fields.startDate, endDate, startUtc: null, endUtc: null };
    } else {
        if (!isHhmm(fields.startTime)) return { ok: false, code: 'timeInvalid', field: 'startTime' };
        if (!isHhmm(fields.endTime)) return { ok: false, code: 'timeInvalid', field: 'endTime' };
        const startUtc = localToUtcIso(fields.startDate, fields.startTime);
        const endUtc = localToUtcIso(endDate, fields.endTime);
        if (endUtc < startUtc) return { ok: false, code: 'endBeforeStart', field: 'endTime' };
        timing = { startDate: fields.startDate, endDate, startUtc, endUtc };
    }

    if (fields.lieu.trim().length > EVENT_LIEU_MAX) return { ok: false, code: 'lieuTooLong', field: 'lieu' };
    if (fields.description.trim().length > EVENT_DESCRIPTION_MAX) return { ok: false, code: 'descriptionTooLong', field: 'description' };
    if (fields.reminders.length > EVENT_REMINDERS_MAX) return { ok: false, code: 'tooManyReminders', field: 'reminders' };

    const repeat = buildRepeat(fields, fields.startDate, fields.isFullDay);
    if (!repeat.ok) return { ok: false, code: repeat.code, field: repeat.code === 'repeatCountInvalid' ? 'repeatCount' : 'repeatUntil' };
    return { ok: true, timing, rule: repeat.rule };
}

export function buildCreateEventPayload(fields: CalendarEventFormFields, timezone = browserTimezone()): Result<CreateCalendarEventPayload> {
    const checked = validate(fields);
    if (!checked.ok) return checked;
    const { timing, rule } = checked;
    const payload: CreateCalendarEventPayload = {
        calendarPublicId: fields.calendarPublicId || null,
        title: fields.title.trim(),
        isFullDay: fields.isFullDay,
        reminders: fields.reminders
    };
    if (fields.isFullDay) {
        payload.startDate = timing.startDate;
        payload.endDate = timing.endDate;
    } else {
        payload.startUtc = timing.startUtc ?? undefined;
        payload.endUtc = timing.endUtc ?? undefined;
        payload.timezone = timezone;
    }
    if (fields.lieu.trim()) payload.lieu = fields.lieu.trim();
    if (fields.description.trim()) payload.description = fields.description.trim();
    if (rule) payload.recurrenceRule = rule;
    return { ok: true, payload };
}

function sameReminders(a: CalendarReminder[], b: CalendarReminder[]): boolean {
    const key = (list: CalendarReminder[]) =>
        list
            .map((r) => `${r.beforeMinutes}:${r.canal.toLowerCase()}`)
            .sort()
            .join('|');
    return key(a) === key(b);
}

export function isRepeatEdited(fields: CalendarEventFormFields, initial: CalendarEventFormFields): boolean {
    return repeatChanged(fields, initial);
}

export type UpdateEventContext = {
    event: CalendarEvent;
    /** Champs à l'ouverture : seuls les écarts partent. */
    initial: CalendarEventFormFields;
    scope: CalendarEventScope;
    /** Début d'origine de l'occurrence ouverte (portées `occurrence` et `following`). */
    occurrenceStart?: string | null;
    timezone?: string;
};

/** Requête de modification ; `changed` faux si rien n'a bougé. */
export function buildUpdateEventPayload(
    fields: CalendarEventFormFields,
    ctx: UpdateEventContext
): { ok: true; payload: UpdateCalendarEventPayload; changed: boolean } | CalendarEventPayloadFail {
    const checked = validate(fields);
    if (!checked.ok) return checked;
    const { event, initial, scope } = ctx;
    const payload: UpdateCalendarEventPayload = { rowVersion: event.rowVersion, scope };
    if (scope !== 'series' && ctx.occurrenceStart) payload.occurrenceStart = ctx.occurrenceStart;

    if (fields.title.trim() !== initial.title.trim()) payload.title = fields.title.trim();
    if (fields.lieu.trim() !== initial.lieu.trim()) payload.lieu = fields.lieu.trim();
    if (fields.description.trim() !== initial.description.trim()) payload.description = fields.description.trim();

    const timingChanged = fields.isFullDay
        ? fields.startDate !== initial.startDate || (fields.endDate || fields.startDate) !== (initial.endDate || initial.startDate)
        : fields.startDate !== initial.startDate ||
          fields.startTime !== initial.startTime ||
          (fields.endDate || fields.startDate) !== (initial.endDate || initial.startDate) ||
          fields.endTime !== initial.endTime;
    if (timingChanged) Object.assign(payload, timingPayload(fields, checked.timing, ctx));

    if (scope !== 'occurrence' && repeatChanged(fields, initial)) payload.recurrenceRule = checked.rule ?? '';
    if (!sameReminders(fields.reminders, initial.reminders)) payload.reminders = fields.reminders;

    const changed = Object.keys(payload).some((key) => !['rowVersion', 'scope', 'occurrenceStart'].includes(key));
    return { ok: true, payload, changed };
}

/** Horaire à envoyer : celui de l'occurrence, ou pour toute la série son début décalé d'autant. */
function timingPayload(fields: CalendarEventFormFields, timing: Timing, ctx: UpdateEventContext): Partial<UpdateCalendarEventPayload> {
    const { event, initial, scope } = ctx;
    if (event.isFullDay) {
        const span = dayDiff(timing.startDate, timing.endDate);
        if (scope !== 'series' || !event.startDate || !initial.startDate) return { startDate: timing.startDate, endDate: timing.endDate };
        const startDate = addDaysYmd(event.startDate, dayDiff(initial.startDate, timing.startDate));
        return { startDate, endDate: addDaysYmd(startDate, span) };
    }
    const timezone = ctx.timezone ?? browserTimezone();
    const startMs = Date.parse(timing.startUtc!);
    const duration = Date.parse(timing.endUtc!) - startMs;
    if (scope !== 'series' || !event.startUtc || !initial.startDate) {
        return { startUtc: timing.startUtc!, endUtc: timing.endUtc!, timezone };
    }
    const shift = startMs - Date.parse(localToUtcIso(initial.startDate, initial.startTime));
    const seriesStart = Date.parse(event.startUtc) + shift;
    return { startUtc: new Date(seriesStart).toISOString(), endUtc: new Date(seriesStart + duration).toISOString(), timezone };
}
