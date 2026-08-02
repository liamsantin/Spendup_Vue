import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { UserSettings } from './types';

export const userSettingsApi = {
    get() {
        return fetchWrapper.get('/api/settings') as Promise<UserSettings>;
    },
    put(settings: UserSettings) {
        return fetchWrapper.put('/api/settings', settings) as Promise<UserSettings>;
    }
};
