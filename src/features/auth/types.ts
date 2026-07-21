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
    email: string;
    firstName: string | null;
    name: string | null;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
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
