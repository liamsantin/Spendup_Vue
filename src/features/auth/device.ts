import type { DeviceInfo } from './types';

const DEVICE_ID_KEY = 'spendup_device_id';

function createUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function getOrCreateDeviceId(): string {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = createUuid();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
}

/**
 * Libellé court pour l’API (`deviceName`).
 * Browser / OS / pays sont dérivés côté API via User-Agent + IP — ne pas les envoyer explicitement.
 */
export function getDeviceName(): string {
    const uaData = (navigator as Navigator & { userAgentData?: { brands?: { brand: string; version: string }[]; platform?: string } })
        .userAgentData;

    if (uaData?.brands?.length || uaData?.platform) {
        const brand =
            uaData.brands?.find((b) => !/Not.?A.?Brand/i.test(b.brand) && b.brand !== 'Chromium')?.brand ||
            uaData.brands?.find((b) => b.brand === 'Chromium')?.brand ||
            'Navigateur';
        const platform = uaData.platform || 'Appareil';
        return `${brand} sur ${platform}`.slice(0, 80);
    }

    const ua = navigator.userAgent;
    let browser = 'Navigateur';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

    let platform = 'Appareil';
    if (/Windows/i.test(ua)) platform = 'Windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) platform = 'macOS';
    else if (/Android/i.test(ua)) platform = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
    else if (/Linux/i.test(ua)) platform = 'Linux';

    return `${browser} sur ${platform}`.slice(0, 80);
}

/** Payload device à joindre à login / Google / 2FA verify. */
export function getDeviceInfo(): DeviceInfo {
    return {
        deviceIdentifier: getOrCreateDeviceId(),
        deviceName: getDeviceName()
    };
}
