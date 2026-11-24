import { describe, expect, it } from 'vitest';
import { layoutDay, minutesToHhmm, snapToSlot } from '@/features/calendar/timegrid';
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

describe('minutesToHhmm', () => {
    it('écrit l’heure sur deux chiffres', () => {
        expect(minutesToHhmm(0)).toBe('00:00');
        expect(minutesToHhmm(570)).toBe('09:30');
        expect(minutesToHhmm(1440)).toBe('23:59');
    });
});
