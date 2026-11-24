import { describe, expect, it } from 'vitest';
import { layoutDay, minutesToHhmm, placeDrag, selectRange, snapToSlot } from '@/features/calendar/timegrid';
import type { CalendarOccurrence } from '@/features/calendar/types';

const DAY = '2026-12-07';

function at(hour: number, minute = 0, day = 7): string {
    return new Date(2026, 11, day, hour, minute).toISOString();
}

function timed(id: string, start: string, end: string | null): CalendarOccurrence {
    return {
        id,
        sourceKey: null,
        eventPublicId: 'E1',
        entityPublicId: null,
        title: id,
        isFullDay: false,
        startUtc: start,
        endUtc: end,
        startDate: null,
        endDate: null,
        amount: null,
        currency: null,
        status: null,
        color: null,
        isRecurring: false,
        isModified: false
    };
}

function placement(items: CalendarOccurrence[]) {
    return Object.fromEntries(layoutDay(items, DAY).timed.map((b) => [b.occurrence.id, [b.startMin, b.endMin, b.column, b.columns]]));
}

describe('layoutDay', () => {
    it('envoie journées entières et horaires sur plusieurs jours dans le bandeau', () => {
        const fullDay = { ...timed('vacances', at(0), null), isFullDay: true, startUtc: null, startDate: DAY, endDate: DAY };
        const overnight = timed('train de nuit', at(22), at(6, 0, 8));
        const meeting = timed('réunion', at(9), at(10));
        const layout = layoutDay([fullDay, overnight, meeting], DAY);
        expect(layout.allDay.map((o) => o.id)).toEqual(['vacances', 'train de nuit']);
        expect(layout.timed.map((b) => b.occurrence.id)).toEqual(['réunion']);
    });

    it('place un bloc à ses minutes locales ; une fin à minuit va au bout du jour', () => {
        expect(placement([timed('a', at(9, 30), at(11)), timed('b', at(23), at(0, 0, 8))])).toEqual({
            a: [570, 660, 0, 1],
            b: [1380, 1440, 0, 1]
        });
    });

    it('met côte à côte les blocs qui se chevauchent, et seulement eux', () => {
        const result = placement([
            timed('a', at(9), at(11)),
            timed('b', at(10), at(12)),
            timed('c', at(11), at(12)),
            timed('d', at(14), at(15))
        ]);
        // a et b se chevauchent ; c reprend la colonne libérée par a ; d est seul.
        expect(result.a).toEqual([540, 660, 0, 2]);
        expect(result.b).toEqual([600, 720, 1, 2]);
        expect(result.c).toEqual([660, 720, 0, 2]);
        expect(result.d).toEqual([840, 900, 0, 1]);
    });

    it('compte un événement sans durée comme un bloc court dans les chevauchements', () => {
        const result = placement([timed('rappel', at(9), null), timed('suite', at(9, 10), at(9, 40))]);
        expect(result.rappel).toEqual([540, 540, 0, 2]);
        expect(result.suite).toEqual([550, 580, 1, 2]);
    });
});

describe('snapToSlot', () => {
    it('ramène au début de la demi-heure et reste dans la journée', () => {
        expect(snapToSlot(0)).toBe(0);
        expect(snapToSlot(629)).toBe(600);
        expect(snapToSlot(-10)).toBe(0);
        expect(snapToSlot(1500)).toBe(1410);
    });
});

describe('selectRange', () => {
    it('garde le créneau pressé et l’étend vers le pointeur, vers le bas ou vers le haut', () => {
        expect(selectRange(9 * 60 + 10, 9 * 60 + 20)).toEqual({ startMin: 9 * 60, endMin: 9 * 60 + 30 });
        expect(selectRange(9 * 60 + 10, 10 * 60 + 40)).toEqual({ startMin: 9 * 60, endMin: 11 * 60 });
        expect(selectRange(10 * 60 + 10, 8 * 60 + 50)).toEqual({ startMin: 8 * 60 + 30, endMin: 10 * 60 + 30 });
    });

    it('s’arrête à minuit', () => {
        expect(selectRange(23 * 60, 24 * 60)).toEqual({ startMin: 23 * 60, endMin: 24 * 60 });
    });
});

describe('placeDrag', () => {
    const origin = { ymd: DAY, startMin: 9 * 60, endMin: 10 * 60 };

    it('déplace en conservant la durée et cale sur la demi-heure', () => {
        expect(placeDrag(origin, DAY, 10 * 60 + 10, 'move')).toEqual({
            startDate: DAY,
            startTime: '10:00',
            endDate: DAY,
            endTime: '11:00'
        });
    });

    it('change de jour', () => {
        expect(placeDrag(origin, '2026-12-08', 14 * 60, 'move')).toMatchObject({
            startDate: '2026-12-08',
            startTime: '14:00',
            endDate: '2026-12-08',
            endTime: '15:00'
        });
    });

    it('reste dans le jour quand la durée dépasserait minuit', () => {
        expect(placeDrag(origin, DAY, 23 * 60 + 40, 'move')).toEqual({
            startDate: DAY,
            startTime: '23:00',
            endDate: '2026-12-08',
            endTime: '00:00'
        });
    });

    it('allonge ou réduit la fin, avec 30 minutes au minimum et minuit au maximum', () => {
        expect(placeDrag(origin, DAY, 11 * 60 + 10, 'resizeEnd')).toMatchObject({ startTime: '09:00', endTime: '11:00' });
        expect(placeDrag(origin, DAY, 9 * 60 + 10, 'resizeEnd').endTime).toBe('09:30');
        expect(placeDrag(origin, DAY, 24 * 60, 'resizeEnd')).toEqual({
            startDate: DAY,
            startTime: '09:00',
            endDate: '2026-12-08',
            endTime: '00:00'
        });
    });

    it('avance le début sans passer sous 30 minutes', () => {
        expect(placeDrag(origin, DAY, 8 * 60 + 10, 'resizeStart')).toMatchObject({ startTime: '08:00', endTime: '10:00' });
        expect(placeDrag(origin, '2026-12-09', 12 * 60, 'resizeStart')).toMatchObject({
            startDate: DAY,
            startTime: '09:30',
            endTime: '10:00'
        });
    });

    it('déplace un événement sans durée sans lui en donner', () => {
        expect(placeDrag({ ...origin, endMin: origin.startMin }, DAY, 15 * 60, 'move')).toEqual({
            startDate: DAY,
            startTime: '15:00',
            endDate: DAY,
            endTime: '15:00'
        });
    });
});

describe('minutesToHhmm', () => {
    it('écrit l’heure sur deux chiffres', () => {
        expect(minutesToHhmm(0)).toBe('00:00');
        expect(minutesToHhmm(570)).toBe('09:30');
        expect(minutesToHhmm(1440)).toBe('23:59');
    });
});
