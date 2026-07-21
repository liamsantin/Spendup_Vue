export type ApiResponse<T> = {
    success: boolean;
    message: string | null;
    result: T;
};

export type AuthSession = {
    requiresTwoFactor: boolean;
    twoFactorToken: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: string | null;
    userPublicId: string | null;
};

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    userPublicId: string;
};

export type Me = {
    userPublicId: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    name: string | null;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
};

export type RegisterResult = {
    email: string | null;
    username: string | null;
};

export type TwoFactorSetup = {
    secret: string;
    otpAuthUri: string;
    recoveryCodes: string[];
};

export type DeviceInfo = {
    deviceIdentifier: string;
    deviceName: string;
};

/** Username API rules: 3–30 chars, [a-z0-9._-], stored lowercase. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
    return USERNAME_PATTERN.test(normalizeUsername(value));
}
