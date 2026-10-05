import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { Alias, AliasList, AliasTarget, CreateAliasPayload, UpdateAliasPayload } from '@/features/aliases/types';

const BASES: Record<AliasTarget, string> = {
    tier: '/api/tiers',
    paymentMethod: '/api/payment-methods'
};

function aliasesPath(target: AliasTarget, ownerPublicId: string, suffix = '') {
    return `${BASES[target]}/${encodeURIComponent(ownerPublicId)}/aliases${suffix}`;
}

/** Mêmes routes pour les tiers et les moyens de paiement. */
export const aliasesApi = {
    list(target: AliasTarget, ownerPublicId: string) {
        return fetchWrapper.get(aliasesPath(target, ownerPublicId)) as Promise<AliasList>;
    },

    create(target: AliasTarget, ownerPublicId: string, body: CreateAliasPayload) {
        return fetchWrapper.post(aliasesPath(target, ownerPublicId), body) as Promise<Alias>;
    },

    update(target: AliasTarget, ownerPublicId: string, aliasPublicId: string, body: UpdateAliasPayload) {
        return fetchWrapper.put(aliasesPath(target, ownerPublicId, `/${encodeURIComponent(aliasPublicId)}`), body) as Promise<Alias>;
    },

    /** Suppression définitive. */
    remove(target: AliasTarget, ownerPublicId: string, aliasPublicId: string) {
        return fetchWrapper.delete(aliasesPath(target, ownerPublicId, `/${encodeURIComponent(aliasPublicId)}`)) as Promise<void>;
    }
};
