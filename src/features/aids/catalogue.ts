import { AIDS_2026 } from '@/features/aids/data/aids-2026';
import {
    AID_CANTONS,
    AID_FEDERAL,
    AID_THEMES,
    type AidCanton,
    type AidEntry,
    type AidLanguage,
    type AidText,
    type AidTheme,
    type AidYear,
    type LegalParameter
} from '@/features/aids/types';

/** Années au catalogue, de la plus ancienne à la plus récente. Ajouter `data/aids-{année}.ts` chaque novembre. */
export const AID_YEARS: AidYear[] = [{ year: 2026, entries: AIDS_2026 }];

export interface ResolvedAids {
    requestedYear: number;
    year: number;
    /** Vrai quand l’année demandée n’est pas au catalogue et que l’on sert la dernière année connue. */
    isFallback: boolean;
    entries: AidEntry[];
}

/** L’année demandée si elle existe, sinon la dernière année connue qui la précède ; `null` avant la première année. */
export function resolveAids(year: number): ResolvedAids | null {
    const served = AID_YEARS.filter((candidate) => candidate.year <= year).at(-1);
    return served ? { requestedYear: year, year: served.year, isFallback: served.year !== year, entries: served.entries } : null;
}

/** Langue du contenu : l’anglais pour une locale `en*`, sinon le français (repli du catalogue). */
export function aidLanguage(locale: string): AidLanguage {
    return locale.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

/** Texte dans la langue demandée, avec repli sur le français si une traduction manque. */
export function aidText(entry: AidEntry, language: AidLanguage): AidText {
    return entry.texts[language] ?? entry.texts.fr;
}

export type AidCantonFilter = 'all' | typeof AID_FEDERAL | AidCanton;

export function isAidCanton(value: string | null | undefined): value is AidCanton {
    return !!value && (AID_CANTONS as readonly string[]).includes(value.toUpperCase());
}

/** Canton du profil s’il est au catalogue, sinon les aides fédérales seules. */
export function defaultAidCanton(userCanton: string | null | undefined): AidCantonFilter {
    return isAidCanton(userCanton) ? (userCanton.toUpperCase() as AidCanton) : AID_FEDERAL;
}

export interface AidFilter {
    canton: AidCantonFilter;
    /** `all` ou un thème. */
    theme: AidTheme | 'all';
    query: string;
    language: AidLanguage;
}

const normalize = (text: string): string => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

function scopeRank(entry: AidEntry): number {
    return entry.scope === AID_FEDERAL ? -1 : AID_CANTONS.indexOf(entry.scope);
}

/**
 * Aides visibles : fédérales + celles du canton choisi (`all` = tout, `federal` = fédéral seul), puis thème et recherche
 * (titre, résumé, organisme). Triées par thème, les aides fédérales d’abord, puis les cantons romands dans l’ordre du catalogue.
 */
export function filterAids(entries: AidEntry[], filter: AidFilter): AidEntry[] {
    const wanted = normalize(filter.query.trim());
    return entries
        .filter((entry) => {
            if (filter.canton === AID_FEDERAL && entry.scope !== AID_FEDERAL) return false;
            if (filter.canton !== 'all' && filter.canton !== AID_FEDERAL && entry.scope !== AID_FEDERAL && entry.scope !== filter.canton)
                return false;
            if (filter.theme !== 'all' && entry.theme !== filter.theme) return false;
            if (!wanted) return true;
            const text = aidText(entry, filter.language);
            return normalize(`${text.title} ${text.summary} ${text.organization}`).includes(wanted);
        })
        .sort(
            (a, b) => AID_THEMES.indexOf(a.theme) - AID_THEMES.indexOf(b.theme) || scopeRank(a) - scopeRank(b) || a.id.localeCompare(b.id)
        );
}

/** Thèmes qui ont au moins une aide, dans l’ordre du catalogue. */
export function aidThemesPresent(entries: AidEntry[]): AidTheme[] {
    return AID_THEMES.filter((theme) => entries.some((entry) => entry.theme === theme));
}

/** Regroupe des aides déjà triées par thème. */
export function groupAidsByTheme(entries: AidEntry[]): { theme: AidTheme; items: AidEntry[] }[] {
    return AID_THEMES.map((theme) => ({ theme, items: entries.filter((entry) => entry.theme === theme) })).filter(
        (group) => group.items.length > 0
    );
}

/** Montant légal prêt à afficher (ex. « 1’260 CHF/mois », « 6.8 % », « 500 / 1’000 CHF/an »). */
export function formatAidAmount(parameter: LegalParameter, locale: string): string {
    const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
    if (parameter.values?.length) return `${parameter.values.map(number).join(' / ')} ${parameter.unit}`;
    if (parameter.value === null) return '';
    return parameter.unit === '%' ? `${number(parameter.value)} %` : `${number(parameter.value)} ${parameter.unit}`;
}
