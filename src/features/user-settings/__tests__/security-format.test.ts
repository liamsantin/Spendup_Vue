import { describe, expect, it } from 'vitest';
import {
    accessLogStatusColor,
    enumLabel,
    formatCount,
    formatDateTime,
    formatDay,
    formatDurationMinutes,
    formatMonth,
    parseDay
} from '@/features/user-settings/security-format';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('security-format', () => {
    it('formatDurationMinutes : minutes sous l’heure, heures et minutes sur deux chiffres au-delà', () => {
        expect(formatDurationMinutes(t, 12)).toBe('security.common.duration.minutes:{"n":12}');
        expect(formatDurationMinutes(t, 0)).toBe('security.common.duration.minutes:{"n":0}');
        expect(formatDurationMinutes(t, null)).toBe('security.common.duration.minutes:{"n":0}');
        expect(formatDurationMinutes(t, 65)).toBe('security.common.duration.hours:{"h":1,"m":"05"}');
        expect(formatDurationMinutes(t, 120)).toBe('security.common.duration.hours:{"h":2,"m":"00"}');
    });

    it('parseDay lit un jour AAAA-MM-JJ en date locale (sans décalage de fuseau)', () => {
        const date = parseDay('2026-09-01');
        expect(date).not.toBeNull();
        expect(date!.getFullYear()).toBe(2026);
        expect(date!.getMonth()).toBe(8);
        expect(date!.getDate()).toBe(1);
        expect(parseDay('2026-09')).toBeNull();
        expect(parseDay('n/a')).toBeNull();
    });

    it('formatDay / formatMonth / formatDateTime formatent selon la locale et rendent la valeur brute si invalide', () => {
        expect(formatDay('fr', '2026-11-05')).toMatch(/5 nov\. 2026/);
        expect(formatDay('fr', 'invalide')).toBe('invalide');
        expect(formatDay('fr', null)).toBe('');
        expect(formatMonth('fr', '2026-11')).toBe('novembre 2026');
        expect(formatMonth('en', '2026-11')).toBe('November 2026');
        expect(formatMonth('fr', '2026')).toBe('2026');
        expect(formatDateTime('fr', '2026-11-05T21:10:00Z')).toMatch(/2026/);
        expect(formatDateTime('fr', 'pas une date')).toBe('pas une date');
        expect(formatDateTime('fr', undefined)).toBe('');
    });

    it('formatCount applique les séparateurs de la locale', () => {
        expect(formatCount('en', 1234)).toBe('1,234');
        expect(formatCount('en', null)).toBe('0');
    });

    it('enumLabel traduit quand la clé existe, sinon renvoie la valeur brute', () => {
        const te = (key: string) => key === 'security.categories.incident';
        expect(enumLabel(t, te, 'security.categories', 'incident')).toBe('security.categories.incident');
        expect(enumLabel(t, te, 'security.categories', 'nouvelle_categorie')).toBe('nouvelle_categorie');
    });

    it('accessLogStatusColor : bleu en cours, violet annulée, gris sinon', () => {
        expect(accessLogStatusColor('active')).toBe('var(--blue)');
        expect(accessLogStatusColor('email_failed')).toBe('var(--violet)');
        expect(accessLogStatusColor('terminated')).toBe('var(--gray)');
        expect(accessLogStatusColor('expired')).toBe('var(--gray)');
    });
});
