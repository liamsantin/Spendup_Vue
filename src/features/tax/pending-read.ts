import type { TotalCheck, ReadLine } from '@/features/tax/reader/types';
import type { TaxSuggestion } from '@/features/tax/types';

/**
 * Montants lus dans un PDF importé, gardés sur cet appareil (localStorage) tant que l'utilisateur ne les a pas
 * acceptés : ils survivent donc à un rechargement de la page, sans jamais passer par le réseau.
 * Le message d'import, lui, ne s'affiche qu'une fois (mémoire).
 */

export interface StoredRead {
    profileLabel: string;
    items: TaxSuggestion[];
    totals: TotalCheck[];
    unmapped: ReadLine[];
    /** Le panneau de vérification a été fermé : les propositions restent, pas le panneau. */
    dismissed?: boolean;
}

export interface PendingRead {
    items: TaxSuggestion[];
    notice: string | null;
    /** Rapport de lecture (totaux, lignes sans équivalent) tant que le panneau n'est pas fermé. */
    report: Omit<StoredRead, 'items' | 'dismissed'> | null;
}

const PREFIX = 'spendup.tax.read.';
const IMPORTED_PREFIX = 'spendup.tax.fromImport.';
const notices = new Map<string, string>();

function key(publicId: string): string {
    return `${PREFIX}${publicId}`;
}

function load(publicId: string): StoredRead | null {
    try {
        const raw = localStorage.getItem(key(publicId));
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) {
            return { profileLabel: '', items: parsed as TaxSuggestion[], totals: [], unmapped: [], dismissed: true };
        }
        return parsed && typeof parsed === 'object' ? (parsed as StoredRead) : null;
    } catch {
        return null;
    }
}

function save(publicId: string, value: StoredRead | null) {
    try {
        if (value && (value.items.length || (!value.dismissed && (value.totals.length || value.unmapped.length)))) {
            localStorage.setItem(key(publicId), JSON.stringify(value));
        } else localStorage.removeItem(key(publicId));
    } catch {
        /* stockage indisponible : les montants lus ne survivront pas à un rechargement */
    }
}

/** Déclaration créée par import d'un fichier : les propositions de l'application n'y sont pas affichées. */
export function markImportedReturn(publicId: string) {
    try {
        localStorage.setItem(`${IMPORTED_PREFIX}${publicId}`, '1');
    } catch {
        /* stockage indisponible : les propositions de l'application réapparaîtront */
    }
}

export function isImportedReturn(publicId: string): boolean {
    try {
        return localStorage.getItem(`${IMPORTED_PREFIX}${publicId}`) === '1';
    } catch {
        return false;
    }
}

/** Montants lus sur cet appareil, à montrer à l’ouverture du dossier tout juste créé. */
export function stashPendingRead(publicId: string, read: Omit<StoredRead, 'dismissed'> | null, notice: string) {
    save(publicId, read ? { ...read } : null);
    notices.set(publicId, notice);
}

/** Montants encore à valider ; le message d'import n'est rendu qu'à la première ouverture. */
export function takePendingRead(publicId: string): PendingRead {
    const notice = notices.get(publicId) ?? null;
    notices.delete(publicId);
    const stored = load(publicId);
    if (!stored) return { items: [], notice, report: null };
    const report = stored.dismissed ? null : { profileLabel: stored.profileLabel, totals: stored.totals, unmapped: stored.unmapped };
    return { items: stored.items, notice, report };
}

/** Un montant accepté n'est plus à proposer. */
export function forgetPendingRead(publicId: string, code: string, competence: string, person?: string) {
    const stored = load(publicId);
    if (!stored) return;
    save(publicId, {
        ...stored,
        items: stored.items.filter((item) => !(item.code === code && item.competence === competence && (!person || item.person === person)))
    });
}

/** Ferme le panneau de vérification sans toucher aux propositions restantes. */
export function dismissReadReport(publicId: string) {
    const stored = load(publicId);
    if (stored) save(publicId, { ...stored, dismissed: true });
}

/** Déclaration supprimée : on n'en garde rien. */
export function clearPendingRead(publicId: string) {
    notices.delete(publicId);
    save(publicId, null);
    try {
        localStorage.removeItem(`${IMPORTED_PREFIX}${publicId}`);
    } catch {
        /* rien à nettoyer */
    }
}
