import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { RetirementInput, RetirementPillar3aBalance, RetirementProfile, RetirementResult } from '@/features/retirement/types';

const BASE = '/api/retirement';

export const retirementApi = {
    /** Estimation sans rien enregistrer. */
    simulate(input: RetirementInput) {
        return fetchWrapper.post(`${BASE}/simulate`, input) as Promise<RetirementResult>;
    },

    /** Solde des comptes 3a de l'utilisateur, pour préremplir le capital 3a. */
    pillar3aBalance() {
        return fetchWrapper.get(`${BASE}/pillar3a-balance`) as Promise<RetirementPillar3aBalance>;
    },

    getProfile() {
        return fetchWrapper.get(`${BASE}/profile`) as Promise<RetirementProfile>;
    },

    saveProfile(input: RetirementInput) {
        return fetchWrapper.put(`${BASE}/profile`, input) as Promise<RetirementProfile>;
    },

    removeProfile() {
        return fetchWrapper.delete(`${BASE}/profile`) as Promise<void>;
    }
};
