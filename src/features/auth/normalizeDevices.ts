import type { AuthDevice } from './types';

function pickString(source: Record<string, unknown>, ...keys: string[]): string | null {
    for (const key of keys) {
        const value = source[key];
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return null;
}

function pickNumber(source: Record<string, unknown>, ...keys: string[]): number | null {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
    }
    return null;
}

function pickBoolean(source: Record<string, unknown>, ...keys: string[]): boolean | null {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'boolean') return value;
    }
    return null;
}

/** Accepte tableau brut ou objet encapsulant la liste (`devices` / `items` / `data` / `$values`). */
export function extractDevicesPayload(result: unknown): unknown[] {
    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object') {
        const obj = result as Record<string, unknown>;
        for (const key of ['devices', 'items', 'data', 'result', '$values']) {
            if (Array.isArray(obj[key])) return obj[key] as unknown[];
        }
        // Dernier recours : premier tableau trouvé dans l’objet.
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) return value;
        }
    }
    return [];
}

/**
 * Normalise camelCase / snake_case / PascalCase vers `AuthDevice`.
 * Conserve le payload brut pour l’affichage exhaustif.
 */
export function normalizeAuthDevice(input: unknown): AuthDevice | null {
    if (!input || typeof input !== 'object') return null;
    const source = input as Record<string, unknown>;

    const deviceIdentifier =
        pickString(source, 'deviceIdentifier', 'device_identifier', 'DeviceIdentifier') ||
        pickString(source, 'id_devices', 'idDevices', 'IdDevices', 'id');

    if (!deviceIdentifier) return null;

    return {
        deviceIdentifier,
        deviceName: pickString(source, 'deviceName', 'device_name', 'DeviceName', 'name', 'Name') || 'Appareil',
        deviceType: pickString(source, 'deviceType', 'device_type', 'DeviceType'),
        browser: pickString(source, 'browser', 'Browser'),
        os: pickString(source, 'os', 'operatingSystem', 'operating_system', 'OperatingSystem', 'Os'),
        ipAddress: pickString(source, 'ipAddress', 'ip_address', 'last_ip_address', 'lastIpAddress', 'IpAddress', 'ip'),
        country: pickString(source, 'country', 'last_country', 'lastCountry', 'Country'),
        city: pickString(source, 'city', 'City'),
        region: pickString(source, 'region', 'Region'),
        createdAt: pickString(source, 'createdAt', 'created_at', 'CreatedAt'),
        firstSeenAt: pickString(source, 'firstSeenAt', 'first_seen_at', 'FirstSeenAt'),
        lastSeenAt: pickString(source, 'lastSeenAt', 'last_seen_at', 'LastSeenAt'),
        lastActiveAt: pickString(source, 'lastActiveAt', 'last_active_at', 'LastActiveAt'),
        userAgent: pickString(source, 'userAgent', 'user_agent', 'UserAgent'),
        sessionCount: pickNumber(source, 'sessionCount', 'active_sessions_count', 'activeSessionsCount', 'SessionCount'),
        isTrusted: pickBoolean(source, 'isTrusted', 'is_trusted', 'IsTrusted'),
        isCurrentDevice: pickBoolean(source, 'isCurrentDevice', 'is_current_device', 'IsCurrentDevice'),
        raw: source
    };
}

export function normalizeAuthDevices(result: unknown): AuthDevice[] {
    return extractDevicesPayload(result)
        .map(normalizeAuthDevice)
        .filter((device): device is AuthDevice => device != null);
}
