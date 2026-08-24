import { authApi, ApiError } from '@/features/auth/api';
import type { StepUpProof, UpdateProfilePayload } from '@/features/auth/types';
import { i18n } from '@/plugins/i18n';
import type { AuthSessionState } from './auth-session';
import type { AuthLogout } from './auth-logout';

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
    const {
        cookieMode,
        accessToken,
        refreshToken,
        user,
        cookieSessionActive,
        ensureAccessToken,
        requireAccessToken,
        refreshSession
    } = session;

    const { forceReLogin } = deps;

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

    async function updateProfile(payload: UpdateProfilePayload) {
        const token = await requireAccessToken();
        await authApi.updateProfile(token, payload);
        await fetchMe();
    }

    async function setCatalogAvatar(profilePicture: string) {
        const token = await requireAccessToken();
        await authApi.setCatalogAvatar(token, profilePicture);
        await fetchMe();
    }

    async function uploadAvatar(file: File) {
        const token = await requireAccessToken();
        const result = await authApi.uploadAvatar(token, file);
        await fetchMe();
        return result;
    }

    async function deleteAvatar() {
        const token = await requireAccessToken();
        await authApi.deleteAvatar(token);
        await fetchMe();
    }

    async function fetchAvatarBlob() {
        const token = await requireAccessToken();
        return authApi.getAvatarBlob(token);
    }

    async function setUsername(username: string) {
        const token = await requireAccessToken();
        await authApi.setUsername(token, username);
        await fetchMe();
    }

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

    async function changePassword(currentPassword: string | null, newPassword: string, reLoginMessage?: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.changePassword(token, currentPassword, newPassword, stepUp);
        await forceReLogin(reLoginMessage ?? t('auth.notices.passwordUpdatedRelogin'));
    }

    async function unlinkGoogle(currentPassword: string, stepUp?: StepUpProof) {
        const token = await requireAccessToken();
        await authApi.unlinkGoogle(token, currentPassword, stepUp);
        await fetchMe();
    }

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
