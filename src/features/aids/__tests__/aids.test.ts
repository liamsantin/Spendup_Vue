import { describe, expect, it } from 'vitest';
import {
    aidLanguage,
    aidText,
    aidThemesPresent,
    defaultAidCanton,
    filterAids,
    formatAidAmount,
    groupAidsByTheme,
    resolveAids
} from '@/features/aids/catalogue';
import { AIDS_2026 } from '@/features/aids/data/aids-2026';
import {
    AID_AMOUNT_KEYS,
    AID_CANTONS,
    AID_FEDERAL,
    AID_LANGUAGES,
    AID_THEMES,
    AIDS_PATH,
    type AidEntry,
    type LegalParameters
} from '@/features/aids/types';
import { handleDemoRequest } from '@/features/demo/handle';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';
import DemoRoutes from '@/router/DemoRoutes';

const all = (): AidEntry[] => AIDS_2026;
const filter = (partial: Partial<Parameters<typeof filterAids>[1]> = {}) =>
    filterAids(all(), { canton: 'all', theme: 'all', query: '', language: 'fr', ...partial });

describe('contenu du catalogue 2026', () => {
    it('chaque aide a un identifiant unique, un thème et une portée valides', () => {
        const ids = AIDS_2026.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const entry of AIDS_2026) {
            expect(AID_THEMES).toContain(entry.theme);
            expect(entry.scope === AID_FEDERAL || (AID_CANTONS as readonly string[]).includes(entry.scope)).toBe(true);
        }
    });

    it('chaque aide est complète en français et en anglais', () => {
        for (const entry of AIDS_2026) {
            for (const language of AID_LANGUAGES) {
                const text = entry.texts[language];
                expect(text.title.trim(), `${entry.id} ${language} titre`).not.toBe('');
                expect(text.summary.trim(), `${entry.id} ${language} résumé`).not.toBe('');
                expect(text.organization.trim(), `${entry.id} ${language} organisme`).not.toBe('');
                expect(text.conditions.length, `${entry.id} ${language} conditions`).toBeGreaterThan(0);
                expect(text.conditions.every((c) => c.trim() !== '')).toBe(true);
            }
            expect(entry.texts.en.conditions.length, `${entry.id} conditions FR/EN`).toBe(entry.texts.fr.conditions.length);
        }
    });

    it('chaque lien est une page officielle en https, relue à une date valide, jamais ch.ch', () => {
        for (const entry of AIDS_2026) {
            const url = new URL(entry.url);
            expect(url.protocol, entry.id).toBe('https:');
            expect(url.hostname.endsWith('ch.ch') && url.hostname === 'www.ch.ch', entry.id).toBe(false);
            expect(entry.verifiedAt, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(Number.isNaN(Date.parse(entry.verifiedAt)), entry.id).toBe(false);
        }
    });

    it('aucun montant cantonal ni seuil de revenu n’est écrit en chiffres dans les textes', () => {
        const withAmount = AIDS_2026.filter((a) => a.scope !== AID_FEDERAL).filter((a) =>
            AID_LANGUAGES.some((lang) => /\d[\d'’ ]*\s?(CHF|francs|fr\.)/i.test(JSON.stringify(a.texts[lang])))
        );
        expect(withAmount.map((a) => a.id)).toEqual([]);
    });

    it('les cantons romands et Berne couvrent la santé, la formation et l’aide sociale', () => {
        for (const canton of ['JU', 'VD', 'NE', 'FR', 'GE', 'BE']) {
            const themes = AIDS_2026.filter((a) => a.scope === canton).map((a) => a.theme);
            expect(themes, canton).toEqual(expect.arrayContaining(['health', 'education', 'social']));
        }
    });

    it('chacun des 26 cantons a au moins deux aides au catalogue', () => {
        expect(AID_CANTONS).toHaveLength(26);
        for (const canton of AID_CANTONS) {
            expect(AIDS_2026.filter((a) => a.scope === canton).length, canton).toBeGreaterThanOrEqual(2);
        }
    });

    it('une page officielle en allemand ou en italien est signalée dans la note', () => {
        const german = AIDS_2026.find((a) => a.id === 'zh-premium-subsidy')!;
        expect(german.texts.fr.note).toContain('allemand');
        expect(german.texts.en.note).toContain('German');
        const italian = AIDS_2026.find((a) => a.id === 'ti-premium-subsidy')!;
        expect(italian.texts.fr.note).toContain('italien');
    });

    it('la Confédération couvre famille, chômage, retraite et invalidité, énergie et santé', () => {
        const themes = AIDS_2026.filter((a) => a.scope === AID_FEDERAL).map((a) => a.theme);
        expect(themes).toEqual(expect.arrayContaining(['family', 'unemployment', 'retirementDisability', 'energy', 'health']));
    });

    it('les montants affichés viennent de clés connues des paramètres légaux de la démo', () => {
        const params = handleDemoRequest('GET', '/api/legal-parameters?year=2026') as LegalParameters;
        const keys = new Set(params.items.map((i) => i.key));
        for (const entry of AIDS_2026) {
            for (const key of entry.amountKeys ?? []) {
                expect(AID_AMOUNT_KEYS).toContain(key);
                expect(keys.has(key), `${entry.id} ${key}`).toBe(true);
            }
        }
    });
});

describe('année et langue', () => {
    it('sert l’année demandée, ou la dernière année connue en le disant', () => {
        expect(resolveAids(2026)).toMatchObject({ year: 2026, isFallback: false });
        expect(resolveAids(2027)).toMatchObject({ requestedYear: 2027, year: 2026, isFallback: true });
        expect(resolveAids(2025)).toBeNull();
    });

    it('choisit l’anglais pour une locale en*, sinon le français, et se replie sur le français', () => {
        expect(aidLanguage('en')).toBe('en');
        expect(aidLanguage('en-GB')).toBe('en');
        expect(aidLanguage('fr-CH')).toBe('fr');
        expect(aidLanguage('de')).toBe('fr');
        const entry = { ...AIDS_2026[0]!, texts: { fr: AIDS_2026[0]!.texts.fr } } as unknown as AidEntry;
        expect(aidText(entry, 'en').title).toBe(entry.texts.fr.title);
    });
});

describe('filtres', () => {
    it('préchoisit le canton du profil quand il est au catalogue, sinon le fédéral', () => {
        expect(defaultAidCanton('vd')).toBe('VD');
        expect(defaultAidCanton('GE')).toBe('GE');
        expect(defaultAidCanton('ZH')).toBe('ZH');
        expect(defaultAidCanton('XX')).toBe(AID_FEDERAL);
        expect(defaultAidCanton(null)).toBe(AID_FEDERAL);
    });

    it('un canton voit le fédéral et ses propres aides, pas celles des autres', () => {
        const scopes = new Set(filter({ canton: 'VD' }).map((a) => a.scope));
        expect(scopes).toEqual(new Set([AID_FEDERAL, 'VD']));
        expect(filter({ canton: AID_FEDERAL }).every((a) => a.scope === AID_FEDERAL)).toBe(true);
        expect(filter({ canton: 'all' })).toHaveLength(AIDS_2026.length);
    });

    it('filtre par thème et cherche sans tenir compte des accents ni de la casse', () => {
        expect(filter({ theme: 'education' }).every((a) => a.theme === 'education')).toBe(true);
        expect(filter({ query: 'ALLOCATIONS' }).length).toBeGreaterThan(0);
        expect(filter({ query: 'bourses' }).some((a) => a.theme === 'education')).toBe(true);
        expect(filter({ query: 'Neuchatel' }).some((a) => a.scope === 'NE')).toBe(true);
        expect(filter({ query: 'zzz introuvable' })).toEqual([]);
    });

    it('trie par thème puis la Confédération avant les cantons, et regroupe par thème', () => {
        const family = filter({ theme: 'family', canton: 'all' });
        expect(family[0]?.scope).toBe(AID_FEDERAL);
        const groups = groupAidsByTheme(filter());
        expect(groups.map((g) => g.theme)).toEqual(AID_THEMES.filter((t) => groups.some((g) => g.theme === t)));
        expect(aidThemesPresent(all())).toEqual(groups.map((g) => g.theme));
    });

    it('cherche aussi dans la langue affichée', () => {
        expect(filter({ query: 'unemployment', language: 'en' }).some((a) => a.id === 'ch-unemployment')).toBe(true);
        expect(filter({ query: 'unemployment', language: 'fr' })).toEqual([]);
    });
});

describe('montants légaux', () => {
    it('formate une valeur, un taux et une liste', () => {
        const base = { key: 'k', label: 'l', source: 's', verifiedAt: '2026-11-21', note: null };
        expect(formatAidAmount({ ...base, value: 215, values: null, unit: 'CHF/mois' }, 'fr-CH')).toContain('215');
        expect(formatAidAmount({ ...base, value: 215, values: null, unit: 'CHF/mois' }, 'fr-CH')).toContain('CHF/mois');
        expect(formatAidAmount({ ...base, value: 10, values: null, unit: '%' }, 'fr-CH')).toMatch(/^10 %$/);
        expect(formatAidAmount({ ...base, value: null, values: [500, 1000], unit: 'CHF/an' }, 'fr-CH')).toContain(' / ');
    });

    it('la démo sert les paramètres 2026, avec repli explicite et refus avant 2026', () => {
        const current = handleDemoRequest('GET', '/api/legal-parameters?year=2026') as LegalParameters;
        expect(current).toMatchObject({ year: 2026, isFallback: false, notice: null });
        expect(current.items.find((i) => i.key === 'avsPensionMin')?.value).toBe(1260);
        const later = handleDemoRequest('GET', '/api/legal-parameters?year=2027') as LegalParameters;
        expect(later).toMatchObject({ requestedYear: 2027, year: 2026, isFallback: true });
        expect(later.notice).toContain('2027');
        expect(() => handleDemoRequest('GET', '/api/legal-parameters?year=2025')).toThrow();
    });
});

describe('navigation', () => {
    it('range la page dans la section Outils, en démo aussi', () => {
        expect(idsFromPath(AIDS_PATH)).toEqual({ openId: 'tools', activeId: 'aids' });
        expect(idsFromPath('/demo/planning/aides').activeId).toBe('aids');
    });

    it('ouvre la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/aides');
        expect(page?.name).toBe('DemoAppAids');
    });
});
