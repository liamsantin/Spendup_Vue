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
    /** Identifiant public à 7 caractères (0-9 + A-Z), ex. `762H2M3`. */
    userPublicId: string;
    email: string | null;
    username: string | null;
    firstName: string | null;
    name: string | null;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    pendingEmail: string | null;
    phone: string | null;
    /** Jour calendaire `YYYY-MM-DD` (sans heure). */
    birthDate: string | null;
    street: string | null;
    streetNumber: string | null;
    countryId: number | null;
    profilePicture: string | null;
};

/** Corps soft de `PUT /api/auth/profile` — `null` = vider le champ. */
export type UpdateProfilePayload = {
    firstName: string | null;
    name: string | null;
    phone: string | null;
    birthDate: string | null;
    street: string | null;
    streetNumber: string | null;
    countryId: number | null;
    profilePicture: string | null;
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

/** Appareil avec session(s) active(s) — GET /api/auth/devices (normalisé côté front). */
export type AuthDevice = {
    deviceIdentifier: string;
    deviceName: string;
    deviceType?: string | null;
    browser?: string | null;
    os?: string | null;
    ipAddress?: string | null;
    country?: string | null;
    city?: string | null;
    region?: string | null;
    createdAt?: string | null;
    firstSeenAt?: string | null;
    lastSeenAt?: string | null;
    lastActiveAt?: string | null;
    userAgent?: string | null;
    sessionCount?: number | null;
    isTrusted?: boolean | null;
    isCurrentDevice?: boolean | null;
    /** Payload brut pour afficher tout champ additionnel. */
    raw?: Record<string, unknown>;
};

/** Username API rules: 3–30 chars, [a-z0-9._-], stored lowercase. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
    return USERNAME_PATTERN.test(normalizeUsername(value));
}
