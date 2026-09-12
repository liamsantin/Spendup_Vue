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
            openId: SHELL_NAV_IDS.dashboard,
            activeId: SHELL_NAV_IDS.dashboard
        });
        expect(idsFromPath('/app/friends')).toEqual({
            openId: SHELL_NAV_IDS.network,
            activeId: SHELL_NAV_IDS.friends
        });
    });

    it('mappe les finances', () => {
        expect(idsFromPath('/app/finances/comptes')).toEqual({
            openId: SHELL_NAV_IDS.finances,
            activeId: SHELL_NAV_IDS.accounts
        });
        expect(idsFromPath('/app/finances/transactions')).toEqual({
            openId: SHELL_NAV_IDS.finances,
            activeId: SHELL_NAV_IDS.transactions
        });
        expect(idsFromPath('/app/finances/moyens-de-paiement')).toEqual({
            openId: SHELL_NAV_IDS.finances,
            activeId: SHELL_NAV_IDS.paymentMethods
        });
    });

    it('mappe les récurrences comme section principale', () => {
        expect(idsFromPath('/app/finances/recurrences')).toEqual({
            openId: SHELL_NAV_IDS.recurrences,
            activeId: SHELL_NAV_IDS.recurrencesOverview
        });
        expect(idsFromPath('/app/finances/recurrences/charges')).toEqual({
            openId: SHELL_NAV_IDS.recurrences,
            activeId: SHELL_NAV_IDS.recurrencesExpenses
        });
        expect(idsFromPath('/app/finances/recurrences/revenus')).toEqual({
            openId: SHELL_NAV_IDS.recurrences,
            activeId: SHELL_NAV_IDS.recurrencesIncomes
        });
        expect(idsFromPath('/app/finances/recurrences/echeances')).toEqual({
            openId: SHELL_NAV_IDS.recurrences,
            activeId: SHELL_NAV_IDS.recurrencesUpcoming
        });
    });

    it('mappe le réseau', () => {
        expect(idsFromPath('/app/friends')).toEqual({
            openId: SHELL_NAV_IDS.network,
            activeId: SHELL_NAV_IDS.friends
        });
        expect(idsFromPath('/app/friends/requests')).toEqual({
            openId: SHELL_NAV_IDS.network,
            activeId: SHELL_NAV_IDS.friends
        });
    });

    it('mappe la gestion', () => {
        expect(idsFromPath('/app/gestion/categories')).toEqual({
            openId: SHELL_NAV_IDS.gestion,
            activeId: SHELL_NAV_IDS.categories
        });
        expect(idsFromPath('/app/gestion/tiers')).toEqual({
            openId: SHELL_NAV_IDS.gestion,
            activeId: SHELL_NAV_IDS.tiers
        });
        expect(idsFromPath('/app/gestion/files')).toEqual({
            openId: SHELL_NAV_IDS.gestion,
            activeId: SHELL_NAV_IDS.files
        });
        expect(idsFromPath('/app/gestion/files/abc')).toEqual({
            openId: SHELL_NAV_IDS.gestion,
            activeId: SHELL_NAV_IDS.files
        });
    });

    it('mappe les budgets', () => {
        expect(idsFromPath('/app/planning/budgets')).toEqual({
            openId: SHELL_NAV_IDS.planning,
            activeId: SHELL_NAV_IDS.budgets
        });
        expect(idsFromPath('/app/planning/budgets/guid-1')).toEqual({
            openId: SHELL_NAV_IDS.planning,
            activeId: SHELL_NAV_IDS.budgets
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
        expect(idsFromPath(SETTINGS_PATHS.privacy)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.privacy
        });
        expect(idsFromPath(SETTINGS_PATHS.security)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.security
        });
        expect(idsFromPath(SETTINGS_PATHS.subscription)).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.subscription
        });
        expect(idsFromPath('/app/comptes')).toEqual({
            openId: SHELL_NAV_IDS.settings,
            activeId: SHELL_NAV_IDS.profile
        });
    });

    it('ne confond pas la boîte de réception et les notifs des paramètres', () => {
        expect(idsFromPath('/app/notifications').openId).toBe(SHELL_NAV_IDS.dashboard);
        expect(idsFromPath(SETTINGS_PATHS.notifications).openId).toBe(SHELL_NAV_IDS.settings);
    });

    it('retombe sur le tableau de bord pour une route inconnue', () => {
        expect(idsFromPath('/app/inconnu')).toEqual({
            openId: SHELL_NAV_IDS.dashboard,
            activeId: SHELL_NAV_IDS.dashboard
        });
    });
});
