import {
    ALIAS_MATCH_TYPES,
    ALIAS_PRIORITY_MAX,
    ALIAS_PRIORITY_MIN,
    ALIAS_VALUE_MAX,
    type Alias,
    type AliasMatchType,
    type UpdateAliasPayload
} from '@/features/aliases/types';

export type AliasFormFields = {
    value: string;
    matchType: AliasMatchType;
    priority: string;
    isActive: boolean;
};

export type AliasPayloadErrorCode =
    | 'valueRequired'
    | 'valueTooLong'
    | 'valueNoAlphanumeric'
    | 'regexInvalid'
    | 'matchTypeInvalid'
    | 'priorityInvalid';

export type BuildAliasPayloadResult =
    | { ok: true; payload: UpdateAliasPayload }
    | { ok: false; code: AliasPayloadErrorCode; field: 'value' | 'matchType' | 'priority' };

export function emptyAliasFormFields(): AliasFormFields {
    return { value: '', matchType: 'exact', priority: '0', isActive: true };
}

export function aliasToFormFields(alias: Alias): AliasFormFields {
    return { value: alias.value, matchType: alias.matchType, priority: String(alias.priority), isActive: alias.isActive };
}

/** Même contrôle que l’API : au moins une lettre ou un chiffre (Unicode). */
const ALPHANUMERIC = /[\p{L}\p{N}]/u;

/** Contrôles locaux ; l’API reste l’arbitre (doublons, unicité d’un alias exact). */
export function buildAliasPayload(fields: AliasFormFields): BuildAliasPayloadResult {
    const value = fields.value.trim();
    if (!value) return { ok: false, code: 'valueRequired', field: 'value' };
    if (value.length > ALIAS_VALUE_MAX) return { ok: false, code: 'valueTooLong', field: 'value' };
    if (!ALIAS_MATCH_TYPES.includes(fields.matchType)) return { ok: false, code: 'matchTypeInvalid', field: 'matchType' };
    if (fields.matchType === 'regex') {
        try {
            new RegExp(value, 'i');
        } catch {
            return { ok: false, code: 'regexInvalid', field: 'value' };
        }
    } else if (!ALPHANUMERIC.test(value)) {
        return { ok: false, code: 'valueNoAlphanumeric', field: 'value' };
    }

    const rawPriority = fields.priority.trim();
    const priority = rawPriority === '' ? 0 : Number(rawPriority);
    if (!Number.isInteger(priority) || priority < ALIAS_PRIORITY_MIN || priority > ALIAS_PRIORITY_MAX) {
        return { ok: false, code: 'priorityInvalid', field: 'priority' };
    }

    return { ok: true, payload: { value, matchType: fields.matchType, priority, isActive: fields.isActive } };
}
