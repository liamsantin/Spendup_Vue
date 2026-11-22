import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { RetirementInput, RetirementProfile, RetirementResult } from '@/features/retirement/types';

const BASE = '/api/retirement';

export const retirementApi = {
    /** Estimation sans rien enregistrer. */
    simulate(input: RetirementInput) {
        return fetchWrapper.post(`${BASE}/simulate`, input) as Promise<RetirementResult>;
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
