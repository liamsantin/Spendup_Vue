import { describe, expect, it } from 'vitest';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import { idsFromPath, SHELL_NAV_IDS } from '../useShellNav';

describe('idsFromPath', () => {
    it('mappe le tableau de bord et les pages générales', () => {
        expect(idsFromPath('/app')).toEqual({
            openId: SHELL_NAV_IDS.dashboard,
            activeId: SHELL_NAV_IDS.dashboard
        });
        expect(idsFromPath('/app/notifications')).toEqual({
            openId: SHELL_NAV_IDS.notifications,
            activeId: SHELL_NAV_IDS.notifications
        });
        expect(idsFromPath('/app/friends')).toEqual({
            openId: SHELL_NAV_IDS.friends,
            activeId: SHELL_NAV_IDS.friends
        });
    });

    it('mappe les finances', () => {
        expect(idsFromPath('/app/finances/comptes')).toEqual({
            openId: SHELL_NAV_IDS.finances,
            activeId: SHELL_NAV_IDS.accounts
        });
        expect(idsFromPath('/app/finances/moyens-de-paiement')).toEqual({
            openId: SHELL_NAV_IDS.finances,
            activeId: SHELL_NAV_IDS.paymentMethods
        });
    });

    it('mappe les pages paramètres', () => {
        expect(idsFromPath(SETTINGS_PATHS.account)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.profile
        });
        expect(idsFromPath(SETTINGS_PATHS.preferences)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.preferences
        });
        expect(idsFromPath(SETTINGS_PATHS.notifications)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.notificationSettings
        });
        expect(idsFromPath(SETTINGS_PATHS.security)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.security
        });
        expect(idsFromPath('/app/comptes')).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.profile
        });
    });

    it('ne confond pas la boîte de réception et les notifs des paramètres', () => {
        expect(idsFromPath('/app/notifications').openId).toBe(SHELL_NAV_IDS.notifications);
        expect(idsFromPath(SETTINGS_PATHS.notifications).openId).toBe(SHELL_NAV_IDS.settings);
    });

    it('retombe sur le tableau de bord pour une route inconnue', () => {
        expect(idsFromPath('/app/inconnu')).toEqual({
            openId: SHELL_NAV_IDS.dashboard,
            activeId: SHELL_NAV_IDS.dashboard
        });
    });
});
