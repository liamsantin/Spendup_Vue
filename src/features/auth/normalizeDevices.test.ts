import { describe, expect, it } from 'vitest';
import { extractDevicesPayload, normalizeAuthDevice, normalizeAuthDevices } from './normalizeDevices';

describe('normalizeAuthDevice', () => {
    it('maps camelCase API payload including trustedUntil and isCurrentDevice', () => {
        const device = normalizeAuthDevice({
            deviceIdentifier: 'uuid-1',
            deviceName: 'Chrome Windows',
            isTrusted: true,
            isCurrentDevice: true,
            trustedUntil: '2026-09-01T16:00:00+02:00',
            lastIpAddress: '127.0.0.1',
            lastCountry: 'Local'
        });

        expect(device).toMatchObject({
            deviceIdentifier: 'uuid-1',
            deviceName: 'Chrome Windows',
            isTrusted: true,
            isCurrentDevice: true,
            trustedUntil: '2026-09-01T16:00:00+02:00',
            ipAddress: '127.0.0.1',
            country: 'Local'
        });
    });

    it('rejects payloads without deviceIdentifier (no numeric id fallback)', () => {
        expect(normalizeAuthDevice({ id: 42, deviceName: 'Legacy' })).toBeNull();
    });

    it('accepts snake_case / PascalCase keys', () => {
        const device = normalizeAuthDevice({
            device_identifier: 'uuid-2',
            DeviceName: 'Safari',
            is_trusted: false,
            IsCurrentDevice: false,
            trusted_until: null
        });

        expect(device).toMatchObject({
            deviceIdentifier: 'uuid-2',
            deviceName: 'Safari',
            isTrusted: false,
            isCurrentDevice: false,
            trustedUntil: null
        });
    });
});

describe('normalizeAuthDevices', () => {
    it('unwraps { devices: [...] }', () => {
        const list = normalizeAuthDevices({
            devices: [
                { deviceIdentifier: 'a', deviceName: 'A' },
                { id: 1, deviceName: 'skip' }
            ]
        });
        expect(list).toHaveLength(1);
        expect(list[0]?.deviceIdentifier).toBe('a');
    });

    it('accepts a raw array', () => {
        expect(extractDevicesPayload([{ deviceIdentifier: 'x' }])).toHaveLength(1);
        expect(normalizeAuthDevices([{ deviceIdentifier: 'x', deviceName: 'X' }])).toHaveLength(1);
    });
});
