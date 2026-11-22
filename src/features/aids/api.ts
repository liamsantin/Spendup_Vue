import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { LegalParameters } from '@/features/aids/types';

export const legalParametersApi = {
    /** Montants légaux suisses d’une année (`GET /api/legal-parameters`, repli sur la dernière année connue). */
    get(year?: number) {
        return fetchWrapper.get(`/api/legal-parameters${year ? `?year=${year}` : ''}`) as Promise<LegalParameters>;
    }
};
