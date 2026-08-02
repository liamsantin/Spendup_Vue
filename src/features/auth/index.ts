export { authApi, authHttp, ApiError, authRequest } from './api';
export { getDeviceInfo, getOrCreateDeviceId, getDeviceName } from './device';
export { normalizeAuthDevices, normalizeAuthDevice } from './normalizeDevices';
export { useAuthStore, APP_HOME_ROUTE } from './stores/auth-store';
export { useProfileAvatarUrl } from './composables/useProfileAvatarUrl';
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
    UploadAvatarResult
} from './types';
