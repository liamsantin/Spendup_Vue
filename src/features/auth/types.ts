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
    /** Double-submit CSRF (si l’API l’expose en body — sinon cookie `spendup_csrf`). */
    csrfToken?: string | null;
};

export type AuthTokens = {
    /** Peut être vide si `ReturnAccessTokenInBody=false` (cookie `spendup_access`). */
    accessToken: string;
    /** Absent / null en mode cookie HttpOnly (P1). */
    refreshToken?: string | null;
    expiresAt: string;
    userPublicId: string;
    /** Double-submit CSRF (rotation à chaque refresh cookie). */
    csrfToken?: string | null;
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

/** Code d’assistance généré — POST /api/auth/security/support-code (montré une seule fois). */
export type SupportCode = {
    code: string;
    expiresAt: string;
};

/** État du code d’assistance courant — GET /api/auth/security/support-code (sans le code). */
export type SupportCodeStatus = {
    hasActiveCode: boolean;
    expiresAt: string | null;
    usedAt: string | null;
};

/** Écran consulté pendant un accès technique, regroupé par ressource (`accounts`, `transactions`…). */
export type AccessLogView = {
    resource: string;
    count: number;
};

/** État d’un accès technique : en cours, clôturé, expiré, ou annulé avant tout affichage (e-mail non envoyé). */
export type AccessLogStatus = 'active' | 'terminated' | 'expired' | 'email_failed';

/** Un accès technique subi par l’utilisateur — GET /api/auth/security/access-log. Jamais le nom de l’opérateur. */
export type AccessLogEntry = {
    publicId: string;
    openedAt: string;
    endedAt: string | null;
    durationMinutes: number;
    category: string;
    reason: string;
    status: AccessLogStatus | string;
    codeUsed: boolean;
    userEmailSentAt: string | null;
    views: AccessLogView[];
};

/** Page d’accès techniques (du plus récent au plus ancien). */
export type AccessLogPage = {
    items: AccessLogEntry[];
    page: number;
    pageSize: number;
    totalCount: number;
};

/** Consultation anonymisée du registre de transparence : jour, catégorie, durée, code ou non. */
export type TransparencyConsultation = {
    day: string;
    category: string;
    durationMinutes: number;
    codeUsed: boolean;
};

/** Nature d’une visite de la console : consultation ouverte, statistiques seulement, rien ouvert. */
export type TransparencyConsoleVisitKind = 'consultation' | 'statistics' | 'none';

export type TransparencyConsoleVisit = {
    day: string;
    durationMinutes: number;
    kind: TransparencyConsoleVisitKind | string;
};

/** Totaux d’un mois (`month` au format AAAA-MM). */
export type TransparencyMonth = {
    month: string;
    consoleVisits: number;
    consultations: number;
    usersConsulted: number;
    loginsRefused: number;
};

export type TransparencyCategoryCount = {
    category: string;
    count: number;
};

/** Compteur d’interventions humaines sur le serveur ; `available` faux = indisponible (jamais 0). */
export type TransparencyCounter = {
    available: boolean;
    eventsTotal: number | null;
    updatedAt: string | null;
};

/** Registre de transparence, identique pour tous — GET /api/auth/security/transparency. */
export type TransparencyReport = {
    generatedAt: string;
    fromDay: string;
    toDay: string;
    monthsShown: number;
    consultations: TransparencyConsultation[];
    consoleVisits: TransparencyConsoleVisit[];
    months: TransparencyMonth[];
    byCategory: TransparencyCategoryCount[];
    humanInterventions: TransparencyCounter;
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
