export { authApi, authHttp, ApiError, authRequest } from '@/features/auth/api';
export { getDeviceInfo, getOrCreateDeviceId, getDeviceName } from '@/features/auth/device';
export { resolveIsCurrentDevice } from '@/features/auth/device-current';
export { normalizeAuthDevices, normalizeAuthDevice } from '@/features/auth/normalizeDevices';
export { useAuthStore, APP_HOME_ROUTE } from '@/features/auth/stores/auth-store';
export { sanitizeReturnUrl } from '@/features/auth/safe-return-url';
export { readPasswordResetToken, clearPasswordResetTokenFromUrl } from '@/features/auth/password-reset-token';
export { useIdleLogout } from '@/features/auth/composables/useIdleLogout';
export { useProfileAvatarUrl } from '@/features/auth/composables/useProfileAvatarUrl';
export {
    GOOGLE_DESKTOP_CALLBACK_PATH,
    GOOGLE_DESKTOP_REDIRECT_URI,
    BROWSER_OPEN_ERROR,
    isGoogleDesktopConfigured,
    isGoogleDesktopOAuthInProgress,
    requestGoogleIdTokenDesktop,
    cancelGoogleDesktopOAuth,
    isGoogleDesktopCancelled,
    isGoogleDesktopBrowserOpenError
} from '@/features/auth/google-desktop-oauth';
export { withStepUpRetry, isStepUpRequired, getStepUpChallenge, STEP_UP_REQUIRED_CODE } from '@/features/auth/step-up';
export { isIdleSessionError, isIdleSessionMessage } from '@/features/auth/idle-session';
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, getCsrfToken, rememberCsrfToken, clearCsrfToken, csrfHeaderRecord } from '@/features/auth/csrf';
export { useStepUpStore } from '@/features/auth/stores/step-up-store';
export { USERNAME_PATTERN, normalizeUsername, isValidUsername } from '@/features/auth/types';
export {
    AVATAR_CATALOG_PREFIX,
    CATALOG_AVATARS,
    DEFAULT_AVATAR_SRC,
    catalogAvatarSrc,
    isCatalogProfilePicture,
    isUploadedProfilePicture
} from '@/features/auth/profilePicture';
export type { CatalogAvatarPath } from '@/features/auth/profilePicture';
export type {
    ApiResponse,
    AuthSession,
    AuthTokens,
    Me,
    RegisterResult,
    TwoFactorSetup,
    DeviceInfo,
    AuthDevice,
    UpdateProfilePayload,
    UploadAvatarResult,
    StepUpProof,
    StepUpRequiredDetails
} from '@/features/auth/types';
