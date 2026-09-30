/**
 * Alias de reconnaissance à l’import : une valeur du fichier (colonne Tier / Moyen, ou libellé banque)
 * qui désigne un tier ou un moyen de paiement. Pris en compte à la **prochaine analyse**.
 */
export type AliasTarget = 'tier' | 'paymentMethod';

export type AliasMatchType = 'exact' | 'startsWith' | 'endsWith' | 'contains' | 'regex';

export type Alias = {
    publicId: string;
    value: string;
    matchType: AliasMatchType;
    /** -1000..1000, le plus haut gagne. */
    priority: number;
    /** `false` = ignoré par les imports, mais toujours listé. */
    isActive: boolean;
    /** Créé automatiquement (commit ou apprentissage en revue). */
    createdByImport: boolean;
    createdAt: string;
    updatedAt: string | null;
};

/** Trié par priorité décroissante, puis du plus ancien au plus récent. */
export type AliasList = {
    items: Alias[];
    totalCount: number;
};

export type CreateAliasPayload = {
    value: string;
    matchType?: AliasMatchType;
    priority?: number;
    isActive?: boolean;
};

/** PUT : tous les champs sont obligatoires. */
export type UpdateAliasPayload = {
    value: string;
    matchType: AliasMatchType;
    priority: number;
    isActive: boolean;
};

export const ALIAS_MATCH_TYPES: readonly AliasMatchType[] = ['exact', 'startsWith', 'endsWith', 'contains', 'regex'];
/** Types proposés hors mode avancé. */
export const ALIAS_BASIC_MATCH_TYPES: readonly AliasMatchType[] = ['exact', 'startsWith', 'endsWith', 'contains'];

export const ALIAS_VALUE_MAX = 255;
export const ALIAS_PRIORITY_MIN = -1000;
export const ALIAS_PRIORITY_MAX = 1000;
