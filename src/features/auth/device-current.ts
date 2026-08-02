import type { AuthDevice } from './types';

/**
 * Appareil courant : priorise le flag serveur (`isCurrentDevice` / claim JWT `did`),
 * sinon compare l’UUID local.
 */
export function resolveIsCurrentDevice(device: AuthDevice, localDeviceId: string): boolean {
    if (device.isCurrentDevice === true) return true;
    if (device.isCurrentDevice === false) return false;
    return device.deviceIdentifier === localDeviceId;
}
