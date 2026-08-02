export { authApi, authHttp, ApiError, authRequest } from './api';
export { getDeviceInfo, getOrCreateDeviceId, getDeviceName } from './device';
export { normalizeAuthDevices, normalizeAuthDevice } from './normalizeDevices';
export { useAuthStore, APP_HOME_ROUTE } from './stores/auth-store';
export { sanitizeReturnUrl } from './safe-return-url';
export { readPasswordResetToken, clearPasswordResetTokenFromUrl } from './password-reset-token';
export { useIdleLogout } from './composables/useIdleLogout';
export { useProfileAvatarUrl } from './composables/useProfileAvatarUrl';
export { withStepUpRetry, isStepUpRequired, getStepUpChallenge, STEP_UP_REQUIRED_CODE } from './step-up';
export { isIdleSessionError, isIdleSessionMessage } from './idle-session';
export { useStepUpStore } from './stores/step-up-store';
export { USERNAME_PATTERN, normalizeUsername, isValidUsername } from './types';
export {
    AVATAR_CATALOG_PREFIX,
    CATALOG_AVATARS,
    DEFAULT_AVATAR_SRC,
    catalogAvatarSrc,
    isCatalogProfilePicture,
    isUploadedProfilePicture
} from './profilePicture';
export type { CatalogAvatarPath } from './profilePicture';
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
} from './types';
