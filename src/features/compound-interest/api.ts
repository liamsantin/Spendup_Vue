import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    CompoundCalculation,
    CompoundCalculationList,
    CompoundInterestGoal,
    CompoundInterestGoalRequest,
    CompoundInterestRequest,
    CompoundInterestResult,
    SaveCompoundCalculationPayload
} from '@/features/compound-interest/types';

const BASE = '/api/compound-interest';

export const compoundInterestApi = {
    /** Calcul sans rien enregistrer. */
    simulate(request: CompoundInterestRequest) {
        return fetchWrapper.post(`${BASE}/simulate`, request) as Promise<CompoundInterestResult>;
    },

    /** Calcul inverse : versement ou durée pour atteindre un montant visé. */
    goal(request: CompoundInterestGoalRequest) {
        return fetchWrapper.post(`${BASE}/goal`, request) as Promise<CompoundInterestGoal>;
    },

    list() {
        return fetchWrapper.get(`${BASE}/calculations`) as Promise<CompoundCalculationList>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`${BASE}/calculations/${encodeURIComponent(publicId)}`) as Promise<CompoundCalculation>;
    },

    create(body: SaveCompoundCalculationPayload) {
        return fetchWrapper.post(`${BASE}/calculations`, body) as Promise<CompoundCalculation>;
    },

    update(publicId: string, body: SaveCompoundCalculationPayload) {
        return fetchWrapper.put(`${BASE}/calculations/${encodeURIComponent(publicId)}`, body) as Promise<CompoundCalculation>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`${BASE}/calculations/${encodeURIComponent(publicId)}`) as Promise<void>;
    }
};
