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

export function getDeviceName(): string {
    return navigator.userAgent.slice(0, 80);
}

export function getDeviceInfo(): DeviceInfo {
    return {
        deviceIdentifier: getOrCreateDeviceId(),
        deviceName: getDeviceName()
    };
}
