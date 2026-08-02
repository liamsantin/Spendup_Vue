import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { CountriesResult } from './types';

/** `GET /api/countries` — JWT requis. */
export const countriesApi = {
    getAll() {
        return fetchWrapper.get('/api/countries') as Promise<CountriesResult>;
    }
};
