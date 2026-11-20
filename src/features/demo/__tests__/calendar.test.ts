import { beforeEach, describe, expect, it } from 'vitest';
import { demoEventsForMonth } from '@/features/demo/calendar';
import { resetDemoDb } from '@/features/demo/db';

describe('demoEventsForMonth', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('reprend les écritures de novembre sans doubler le salaire', () => {
        const events = demoEventsForMonth(2026, 10);
        const titles = events.map((event) => event.title);
        expect(titles.filter((title) => title.startsWith('Salaire'))).toEqual(['Salaire novembre']);
        expect(events.find((event) => event.title === 'Loyer')?.amount).toBe(-1850);
        expect(events.find((event) => event.title === 'Versement vacances')?.kind).toBe('goal');
    });

    it('projette le rythme mensuel quand le mois n’a pas d’écritures', () => {
        const events = demoEventsForMonth(2026, 11);
        expect(events.map((event) => event.title)).toContain('Salaire décembre');
        expect(events.find((event) => event.title === 'Loyer')?.date).toBe('2026-12-02');
    });
});
