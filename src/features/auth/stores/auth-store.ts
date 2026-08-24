import { defineStore } from 'pinia';
import { APP_HOME_ROUTE, createAuthSession, createAuthLogout, createAuthProfile, createAuthActions } from '@/features/auth/stores/internal';

export { APP_HOME_ROUTE };

/**
 * Façade Pinia du store auth : session, logout, profil et actions (login / 2FA / devices).
 */
export const useAuthStore = defineStore('auth', () => {
    const session = createAuthSession();
    const logout = createAuthLogout(session);
    const profile = createAuthProfile(session, {
        forceReLogin: logout.forceReLogin
    });
    const actions = createAuthActions(session, {
        fetchMe: profile.fetchMe,
        goToLogin: logout.goToLogin,
        forceReLogin: logout.forceReLogin
    });

    return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        twoFactorToken: session.twoFactorToken,
        pendingEmail: session.pendingEmail,
        pendingPassword: session.pendingPassword,
        user: session.user,
        returnUrl: session.returnUrl,
        isAuthenticated: session.isAuthenticated,
        displayName: session.displayName,
        hasVerifiedEmail: session.hasVerifiedEmail,
        setPendingEmail: session.setPendingEmail,
        setPendingPassword: session.setPendingPassword,
        clearPendingRegistration: session.clearPendingRegistration,
        setTokens: session.setTokens,
        clearSession: session.clearSession,
        applySession: actions.applySession,
        navigateAfterLogin: actions.navigateAfterLogin,
        login: actions.login,
        loginWithGoogle: actions.loginWithGoogle,
        register: actions.register,
        confirmEmail: actions.confirmEmail,
        resendVerification: actions.resendVerification,
        forgotPassword: actions.forgotPassword,
        resetPassword: actions.resetPassword,
        confirmEmailChange: actions.confirmEmailChange,
        verifyTwoFactor: actions.verifyTwoFactor,
        setupTwoFactor: actions.setupTwoFactor,
        enableTwoFactor: actions.enableTwoFactor,
        disableTwoFactor: actions.disableTwoFactor,
        listDevices: actions.listDevices,
        revokeDevice: actions.revokeDevice,
        setDeviceTrust: actions.setDeviceTrust,
        revokeAllDevices: actions.revokeAllDevices,
        refreshSession: session.refreshSession,
        bootstrapSession: session.bootstrapSession,
        fetchMe: profile.fetchMe,
        updateProfile: profile.updateProfile,
        setCatalogAvatar: profile.setCatalogAvatar,
        uploadAvatar: profile.uploadAvatar,
        deleteAvatar: profile.deleteAvatar,
        fetchAvatarBlob: profile.fetchAvatarBlob,
        setUsername: profile.setUsername,
        changeEmail: profile.changeEmail,
        changePassword: profile.changePassword,
        unlinkGoogle: profile.unlinkGoogle,
        deleteAccount: profile.deleteAccount,
        ensureAccessToken: session.ensureAccessToken,
        requireAccessToken: session.requireAccessToken,
        logout: logout.logout,
        consumeLoginNotice: logout.consumeLoginNotice,
        goToLogin: logout.goToLogin,
        forceReLogin: logout.forceReLogin
    };
});
