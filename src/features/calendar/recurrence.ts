/**
 * Répétition d'un événement : choix du formulaire ↔ RRULE (RFC 5545, sans préfixe `RRULE:`).
 * Les règles produites ne fixent ni BYDAY ni BYMONTHDAY : la série suit le jour de son début, et un décalage
 * de la série entière la garde cohérente. Une règle que le formulaire ne sait pas représenter reste `custom`
 * et n'est jamais réécrite.
 */
import { parseYmd } from '@/features/calendar/dates';

export const REPEAT_PRESETS = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as const;
export type RepeatPreset = (typeof REPEAT_PRESETS)[number] | 'custom';
export type RepeatEnd = 'never' | 'until' | 'count';

export const REPEAT_COUNT_MAX = 999;

export type RepeatFields = {
    repeat: RepeatPreset;
    repeatEnd: RepeatEnd;
    /** Dernier jour possible (`yyyy-MM-dd`, inclus). */
    repeatUntil: string | null;
    repeatCount: string;
    /** Règle d'origine quand `repeat` vaut `custom`. */
    customRule: string;
};

const WEEKDAYS = 'MO,TU,WE,TH,FR';

const FREQ_OF: Record<Exclude<RepeatPreset, 'none' | 'custom'>, string> = {
    daily: 'FREQ=DAILY',
    weekdays: `FREQ=WEEKLY;BYDAY=${WEEKDAYS}`,
    weekly: 'FREQ=WEEKLY',
    monthly: 'FREQ=MONTHLY',
    yearly: 'FREQ=YEARLY'
};

const BYDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

export function emptyRepeatFields(): RepeatFields {
    return { repeat: 'none', repeatEnd: 'never', repeatUntil: null, repeatCount: '10', customRule: '' };
}

function pad(n: number, width = 2): string {
    return String(n).padStart(width, '0');
}

function parts(rule: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const part of rule.replace(/^RRULE:/i, '').split(';')) {
        const [key, value] = part.split('=');
        if (key && value !== undefined) map.set(key.trim().toUpperCase(), value.trim().toUpperCase());
    }
    return map;
}

/** `UNTIL` → jour local `yyyy-MM-dd` (date seule, ou instant UTC ramené au fuseau du navigateur). */
export function untilToYmd(until: string): string | null {
    const date = /^(\d{4})(\d{2})(\d{2})$/.exec(until);
    if (date) return `${date[1]}-${date[2]}-${date[3]}`;
    const utc = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(until);
    if (!utc) return null;
    const instant = new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6]));
    return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
}

/**
 * `UNTIL` d'un dernier jour inclus : la date pour une journée entière, sinon la fin de ce jour
 * dans le fuseau du navigateur, en UTC (`yyyyMMddTHHmmssZ`).
 */
export function ymdToUntil(ymd: string, isFullDay: boolean): string {
    if (isFullDay) return ymd.replaceAll('-', '');
    const end = parseYmd(ymd);
    end.setHours(23, 59, 59, 0);
    return (
        `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}` +
        `T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}${pad(end.getUTCSeconds())}Z`
    );
}

/**
 * Lit une règle existante. `startYmd` : début de la série, pour reconnaître un BYDAY / BYMONTHDAY qui ne fait
 * que répéter le jour du début (règles écrites par l'API ou importées d'un `.ics`).
 */
export function parseRepeat(rule: string | null | undefined, startYmd: string | null): RepeatFields {
    const fields = emptyRepeatFields();
    if (!rule?.trim()) return fields;
    const custom = { ...fields, repeat: 'custom' as const, customRule: rule.trim() };
    const map = parts(rule);
    const start = startYmd ? parseYmd(startYmd) : null;

    const interval = map.get('INTERVAL');
    if (interval && interval !== '1') return custom;
    map.delete('INTERVAL');
    map.delete('WKST');

    const count = map.get('COUNT');
    const until = map.get('UNTIL');
    if (count && until) return custom;
    map.delete('COUNT');
    map.delete('UNTIL');

    const freq = map.get('FREQ');
    map.delete('FREQ');
    const byDay = map.get('BYDAY');
    map.delete('BYDAY');
    const byMonthDay = map.get('BYMONTHDAY');
    map.delete('BYMONTHDAY');
    if (map.size) return custom;

    let repeat: RepeatPreset | null = null;
    if (freq === 'DAILY' && !byDay && !byMonthDay) repeat = 'daily';
    else if (freq === 'WEEKLY' && !byMonthDay) {
        if (!byDay || (start && byDay === BYDAY_CODES[start.getDay()])) repeat = 'weekly';
        else if (byDay === WEEKDAYS) repeat = 'weekdays';
    } else if (freq === 'MONTHLY' && !byDay) {
        if (!byMonthDay || (start && byMonthDay === String(start.getDate()))) repeat = 'monthly';
    } else if (freq === 'YEARLY' && !byDay && !byMonthDay) repeat = 'yearly';
    if (!repeat) return custom;

    fields.repeat = repeat;
    if (count) {
        if (!/^\d+$/.test(count)) return custom;
        fields.repeatEnd = 'count';
        fields.repeatCount = count;
    } else if (until) {
        const ymd = untilToYmd(until);
        if (!ymd) return custom;
        fields.repeatEnd = 'until';
        fields.repeatUntil = ymd;
    }
    return fields;
}

export type RepeatErrorCode = 'repeatUntilRequired' | 'repeatUntilBeforeStart' | 'repeatCountInvalid';
export type BuildRepeatResult = { ok: true; rule: string | null } | { ok: false; code: RepeatErrorCode };

/** Règle à envoyer ; `null` = pas de répétition. Une règle `custom` est rendue telle quelle. */
export function buildRepeat(fields: RepeatFields, startYmd: string, isFullDay: boolean): BuildRepeatResult {
    if (fields.repeat === 'none') return { ok: true, rule: null };
    if (fields.repeat === 'custom') return { ok: true, rule: fields.customRule.trim() || null };

    let rule = FREQ_OF[fields.repeat];
    if (fields.repeatEnd === 'count') {
        const raw = fields.repeatCount.trim();
        const count = Number(raw);
        if (!/^\d+$/.test(raw) || count < 1 || count > REPEAT_COUNT_MAX) return { ok: false, code: 'repeatCountInvalid' };
        rule += `;COUNT=${count}`;
    } else if (fields.repeatEnd === 'until') {
        if (!fields.repeatUntil) return { ok: false, code: 'repeatUntilRequired' };
        if (fields.repeatUntil < startYmd) return { ok: false, code: 'repeatUntilBeforeStart' };
        rule += `;UNTIL=${ymdToUntil(fields.repeatUntil, isFullDay)}`;
    }
    return { ok: true, rule };
}

/** Les champs de répétition diffèrent-ils (ce que l'utilisateur a choisi, pas le texte de la règle) ? */
export function repeatChanged(a: RepeatFields, b: RepeatFields): boolean {
    if (a.repeat !== b.repeat) return true;
    if (a.repeat === 'none' || a.repeat === 'custom') return false;
    if (a.repeatEnd !== b.repeatEnd) return true;
    if (a.repeatEnd === 'until') return a.repeatUntil !== b.repeatUntil;
    if (a.repeatEnd === 'count') return a.repeatCount.trim() !== b.repeatCount.trim();
    return false;
}
