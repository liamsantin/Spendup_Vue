import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { UserSettings, UserSettingsPatch } from '@/features/user-settings/types';

export const userSettingsApi = {
    get() {
        return fetchWrapper.get('/api/settings') as Promise<UserSettings>;
    },
    /** Remplacement total (legacy / fallback). */
    put(settings: UserSettings) {
        return fetchWrapper.put('/api/settings', settings) as Promise<UserSettings>;
    },
    /** Mise à jour partielle — clés présentes uniquement. */
    patch(patch: UserSettingsPatch) {
        return fetchWrapper.patch('/api/settings', patch) as Promise<UserSettings>;
    }
};
