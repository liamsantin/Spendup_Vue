import { authApi, ApiError } from '@/features/auth/api';
import type { StepUpProof, UpdateProfilePayload } from '@/features/auth/types';
import { i18n } from '@/plugins/i18n';
import type { AuthSessionState } from '@/features/auth/stores/internal/auth-session';
import type { AuthLogout } from '@/features/auth/stores/internal/auth-logout';

function t(key: string) {
    return i18n.global.t(key);
}

type ProfileDeps = Pick<AuthLogout, 'forceReLogin'>;

/**
 * Profil utilisateur : me, avatar, username, email, password, delete.
 * @param session État session partagé.
 * @param deps Actions logout (force re-login).
 * @returns Les actions profil.
 */
export function createAuthProfile(session: AuthSessionState, deps: ProfileDeps) {
    const { cookieMode, accessToken, refreshToken, user, cookieSessionActive, ensureAccessToken, requireAccessToken, refreshSession } =
        session;

    const { forceReLogin } = deps;

    /**
     * Charge le profil courant (`/me`) et met à jour `user`.
     * @returns Le profil, ou `null` si non authentifié.
     */
    async function fetchMe() {
        if (cookieMode) {
            const token = await ensureAccessToken();
            if (!cookieSessionActive.value) {
                user.value = null;
                return null;
            }
            try {
                user.value = await authApi.me(token);
                return user.value;
            } catch (e: unknown) {
                if (e instanceof ApiError && e.status === 401) {
                    const ok = await refreshSession();
                    if (ok && cookieSessionActive.value) {
                        user.value = await authApi.me(accessToken.value);
                        return user.value;
                    }
                }
                throw e;
            }
        }

        const token = await ensureAccessToken();
        if (!token) {
            user.value = null;
            return null;
        }
        try {
            user.value = await authApi.me(token);
            return user.value;
        } catch (e: unknown) {
            if (e instanceof ApiError && e.status === 401 && refreshToken.value) {
                const ok = await refreshSession();
                if (ok && accessToken.value) {
                    user.value = await authApi.me(accessToken.value);
                    return user.value;
                }
            }
            throw e;
        }
    }

    /**
     * Met à jour les champs profil puis recharge `/me`.
     * @param payload Champs à mettre à jour.
     */
    async function updateProfile(payload: UpdateProfilePayload) {
        const token = await requireAccessToken();
        await authApi.updateProfile(token, payload);
        await fetchMe();
    }

    /**
     * Définit un avatar catalogue.
     * @param profilePicture Identifiant / clé de l’avatar catalogue.
     */
    async function setCatalogAvatar(profilePicture: string) {
        const token = await requireAccessToken();
        await authApi.setCatalogAvatar(token, profilePicture);
        await fetchMe();
    }

    /**
     * Upload un avatar personnalisé.
     * @param file Fichier image.
     * @returns Réponse API d’upload.
     */
    async function uploadAvatar(file: File) {
        const token = await requireAccessToken();
        const result = await authApi.uploadAvatar(token, file);
        await fetchMe();
        return result;
    }

    /** Supprime l’avatar courant. */
    async function deleteAvatar() {
        const token = await requireAccessToken();
        await authApi.deleteAvatar(token);
        await fetchMe();
    }

    /** Récupère le blob de l’avatar uploadé (affichage). */
    async function fetchAvatarBlob() {
        const token = await requireAccessToken();
        return authApi.getAvatarBlob(token);
    }

    /**
     * Définit le nom d’utilisateur.
     * @param username Nouveau username.
     */
    async function setUsername(username: string) {
        const token = await requireAccessToken();
        await authApi.setUsername(token, username);
        await fetchMe();
    }

    /**
     * Demande un changement d’e-mail (confirmation ensuite).
     * @param payload Nouvel e-mail + preuve (mdp / Google / step-up).
     */
    async function changeEmail(payload: {
        newEmail: string;
        currentPassword?: string | null;
        googleIdToken?: string | null;
        stepUp?: StepUpProof;
    }) {
        const token = await requireAccessToken();
        await authApi.changeEmail(token, payload);
        await fetchMe();
    }

    /**
     * Change le mot de passe puis force un re-login.
     * @param currentPassword Mot de passe actuel (ou `null` si création).
     * @param newPassword Nouveau mot de passe.
     * @param reLoginMessage Notice affichée au re-login.
     * @param stepUp Preuve step-up optionnelle.
     */
    async function changePassword(currentPassword: string | null, newPassword: string, reLoginMessage?: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.changePassword(token, currentPassword, newPassword, stepUp);
        await forceReLogin(reLoginMessage ?? t('auth.notices.passwordUpdatedRelogin'));
    }

    /**
     * Délie le compte Google (nécessite un mot de passe).
     * @param currentPassword Mot de passe actuel.
     * @param stepUp Preuve step-up optionnelle.
     */
    async function unlinkGoogle(currentPassword: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.unlinkGoogle(token, currentPassword, stepUp);
        await fetchMe();
    }

    /**
     * Supprime le compte puis force un re-login.
     * @param payload Preuve (mdp / Google / step-up).
     */
    async function deleteAccount(payload: { currentPassword?: string; googleIdToken?: string; stepUp?: StepUpProof }) {
        const token = await requireAccessToken();
        await authApi.deleteAccount(token, payload);
        await forceReLogin(t('auth.notices.accountDeleted'));
    }

    return {
        fetchMe,
        updateProfile,
        setCatalogAvatar,
        uploadAvatar,
        deleteAvatar,
        fetchAvatarBlob,
        setUsername,
        changeEmail,
        changePassword,
        unlinkGoogle,
        deleteAccount
    };
}

export type AuthProfile = ReturnType<typeof createAuthProfile>;
