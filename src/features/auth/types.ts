export type ApiResponse<T> = {
    success: boolean;
    message: string | null;
    result: T;
    code?: string | null;
    details?: unknown;
};

/** Preuve fraîche pour actions sensibles (P1 step-up). */
export type StepUpProof = {
    password?: string;
    otp?: string;
    googleIdToken?: string;
};

export type StepUpRequiredDetails = {
    requiresPassword: boolean;
    requiresOtp: boolean;
    requiresGoogleIdToken: boolean;
    acceptedMethods: string[];
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
    /** Absent / null en mode cookie HttpOnly (P1). */
    refreshToken?: string | null;
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
    /**
     * Avatar catalogue (`/avatar/…`), hash SHA-256 uploadé (64 hex), ou `null`.
     * Géré via `/api/auth/me/avatar`, pas via `PUT /profile`.
     */
    profilePicture: string | null;
    /**
     * `false` = aucun mot de passe (compte Google-only typiquement).
     * Absent / null = inconnu (UI prudente).
     */
    hasPassword?: boolean | null;
    /** Compte lié à Google (GIS). */
    hasGoogle?: boolean | null;
};

/** Corps soft de `PUT /api/auth/profile` — `null` = vider le champ. Photo hors scope. */
export type UpdateProfilePayload = {
    firstName: string | null;
    name: string | null;
    phone: string | null;
    birthDate: string | null;
    street: string | null;
    streetNumber: string | null;
    countryId: number | null;
};

/** Réponse `POST /api/auth/me/avatar`. */
export type UploadAvatarResult = {
    profilePicture: string;
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
    /** Calculé serveur via claim JWT `did` (fallback client possible). */
    isCurrentDevice?: boolean | null;
    /** Fin de la fenêtre de confiance (API) ; null si non trusted. */
    trustedUntil?: string | null;
    /** Payload brut pour l’affichage exhaustif. */
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
