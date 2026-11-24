import { describe, expect, it } from 'vitest';
import { buildRepeat, emptyRepeatFields, parseRepeat, repeatChanged, untilToYmd, ymdToUntil } from '@/features/calendar/recurrence';

describe('parseRepeat', () => {
    it('reconnaît les choix du formulaire, avec ou sans le jour du début répété', () => {
        expect(parseRepeat(null, '2026-03-02').repeat).toBe('none');
        expect(parseRepeat('FREQ=DAILY', '2026-03-02').repeat).toBe('daily');
        expect(parseRepeat('FREQ=WEEKLY', '2026-03-02').repeat).toBe('weekly');
        // 2 mars 2026 = lundi
        expect(parseRepeat('FREQ=WEEKLY;BYDAY=MO', '2026-03-02').repeat).toBe('weekly');
        expect(parseRepeat('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-03-02').repeat).toBe('weekdays');
        expect(parseRepeat('FREQ=MONTHLY;BYMONTHDAY=2', '2026-03-02').repeat).toBe('monthly');
        expect(parseRepeat('FREQ=YEARLY;INTERVAL=1', '2026-03-02').repeat).toBe('yearly');
    });

    it('lit la fin de la série', () => {
        expect(parseRepeat('FREQ=DAILY;COUNT=5', '2026-03-02')).toMatchObject({ repeatEnd: 'count', repeatCount: '5' });
        expect(parseRepeat('FREQ=DAILY;UNTIL=20260331', '2026-03-02')).toMatchObject({ repeatEnd: 'until', repeatUntil: '2026-03-31' });
    });

    it('garde telle quelle une règle que le formulaire ne sait pas représenter', () => {
        for (const rule of ['FREQ=WEEKLY;INTERVAL=2', 'FREQ=WEEKLY;BYDAY=TU', 'FREQ=MONTHLY;BYDAY=1MO', 'FREQ=DAILY;BYHOUR=9']) {
            expect(parseRepeat(rule, '2026-03-02')).toMatchObject({ repeat: 'custom', customRule: rule });
        }
    });
});

describe('buildRepeat', () => {
    it('écrit la règle et sa fin', () => {
        const fields = { ...emptyRepeatFields(), repeat: 'weekly' as const };
        expect(buildRepeat(fields, '2026-03-02', false)).toEqual({ ok: true, rule: 'FREQ=WEEKLY' });
        expect(buildRepeat({ ...fields, repeatEnd: 'count', repeatCount: '4' }, '2026-03-02', false)).toEqual({
            ok: true,
            rule: 'FREQ=WEEKLY;COUNT=4'
        });
        expect(buildRepeat({ ...fields, repeatEnd: 'until', repeatUntil: '2026-03-31' }, '2026-03-02', true)).toEqual({
            ok: true,
            rule: 'FREQ=WEEKLY;UNTIL=20260331'
        });
        expect(buildRepeat(emptyRepeatFields(), '2026-03-02', false)).toEqual({ ok: true, rule: null });
    });

    it('refuse une fin incohérente', () => {
        const fields = { ...emptyRepeatFields(), repeat: 'daily' as const };
        expect(buildRepeat({ ...fields, repeatEnd: 'count', repeatCount: '0' }, '2026-03-02', false)).toMatchObject({ ok: false });
        expect(buildRepeat({ ...fields, repeatEnd: 'until', repeatUntil: '2026-03-01' }, '2026-03-02', false)).toEqual({
            ok: false,
            code: 'repeatUntilBeforeStart'
        });
        expect(buildRepeat({ ...fields, repeatEnd: 'until', repeatUntil: null }, '2026-03-02', false)).toEqual({
            ok: false,
            code: 'repeatUntilRequired'
        });
    });

    it('relit le jour inclus d’un UNTIL horaire', () => {
        expect(untilToYmd(ymdToUntil('2026-03-31', false))).toBe('2026-03-31');
    });
});

describe('repeatChanged', () => {
    it('compare les choix, pas le texte de la règle', () => {
        const before = parseRepeat('FREQ=WEEKLY;BYDAY=MO', '2026-03-02');
        expect(repeatChanged(before, { ...before })).toBe(false);
        expect(repeatChanged(before, { ...before, repeat: 'daily' })).toBe(true);
        expect(repeatChanged(before, { ...before, repeatEnd: 'count' })).toBe(true);
    });
});
