import { describe, expect, it } from 'vitest';
import { resolveIsCurrentDevice } from '@/features/auth/device-current';
import type { AuthDevice } from '@/features/auth/types';

function device(overrides: Partial<AuthDevice> = {}): AuthDevice {
    return {
        deviceIdentifier: 'local-uuid',
        deviceName: 'Chrome',
        isTrusted: false,
        isCurrentDevice: undefined,
        trustedUntil: null,
        ipAddress: null,
        country: null,
        ...overrides
    };
}

describe('resolveIsCurrentDevice', () => {
    it('priorise isCurrentDevice === true du serveur', () => {
        expect(resolveIsCurrentDevice(device({ deviceIdentifier: 'other', isCurrentDevice: true }), 'local-uuid')).toBe(true);
    });

    it('priorise isCurrentDevice === false du serveur', () => {
        expect(resolveIsCurrentDevice(device({ deviceIdentifier: 'local-uuid', isCurrentDevice: false }), 'local-uuid')).toBe(false);
    });

    it('fallback sur l’UUID local si le flag est absent', () => {
        expect(resolveIsCurrentDevice(device({ deviceIdentifier: 'local-uuid' }), 'local-uuid')).toBe(true);
        expect(resolveIsCurrentDevice(device({ deviceIdentifier: 'other' }), 'local-uuid')).toBe(false);
    });
});
