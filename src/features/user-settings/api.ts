import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type { StepUpProof } from '@/features/auth/types';
import type { UserSettings, UserSettingsPatch } from '@/features/user-settings/types';

export const userSettingsApi = {
    get() {
        return fetchWrapper.get('/api/settings') as Promise<UserSettings>;
    },
    /** Remplacement total (legacy / fallback). */
    put(settings: UserSettings, stepUp?: StepUpProof) {
        return fetchWrapper.put('/api/settings', stepUp ? { ...settings, stepUp } : settings) as Promise<UserSettings>;
    },
    /**
     * Mise à jour partielle — clés présentes uniquement.
     * Baisser une protection (alertes de sécurité, 2FA des actions sensibles, délais) demande `stepUp`.
     */
    patch(patch: UserSettingsPatch, stepUp?: StepUpProof) {
        return fetchWrapper.patch('/api/settings', stepUp ? { ...patch, stepUp } : patch) as Promise<UserSettings>;
    }
};
