import { afterEach, describe, expect, it } from 'vitest';
import { effectiveTimeZone, todayInTimeZone } from '@/utils/helpers/today';
import { toPlainDecimalString } from '@/utils/helpers/decimal-string';
import { isOperationDateInFuture, isOperationDateInFutureUtc } from '@/features/transactions/format';
import { buildCreateTransactionPayload, type TransactionFormFields } from '@/features/transactions/payload';
import { filterCategoryTreeByType } from '@/features/categories/format';
import { createCategoriesState } from '@/features/categories/stores/internal/categories-state';
import type { Category } from '@/features/categories/types';
import { hubRestartDelayMs } from '@/features/notifications/hub';
import { clearDemoDeviceStorage, deviceStorage } from '@/features/demo/device-storage';
import { clearDemoSession, markDemoSession } from '@/features/demo/session';
import { createTokenBroadcast } from '@/features/auth/token-broadcast';
import { TOKEN_CHAIN_KEY } from '@/features/auth/session-storage';
import type { AuthTokens } from '@/features/auth/types';

/** 20 novembre 00h30 en Suisse = 19 novembre 23h30 UTC. */
const SWISS_AFTER_MIDNIGHT = new Date('2026-11-19T23:30:00Z');

function category(publicId: string, type: Category['type'], children: Category[] = []): Category {
    return { publicId, name: publicId, type, children } as unknown as Category;
}

describe('lot 6c Â· date du jour dans le fuseau de lâ€™utilisateur (V2.4)', () => {
    it('Ã  00h30 en Suisse, aujourdâ€™hui est le 20, pas le 19 comme en UTC', () => {
        expect(todayInTimeZone('Europe/Zurich', SWISS_AFTER_MIDNIGHT)).toBe('2026-11-20');
        expect(isOperationDateInFuture('2026-11-20', 'Europe/Zurich', SWISS_AFTER_MIDNIGHT)).toBe(false);
        expect(isOperationDateInFutureUtc('2026-11-20', SWISS_AFTER_MIDNIGHT)).toBe(true);
    });

    it('sans fuseau configurÃ©, prend celui du navigateur', () => {
        expect(effectiveTimeZone(null)).toBeTruthy();
        expect(effectiveTimeZone(' Europe/Zurich ')).toBe('Europe/Zurich');
    });

    it('le payload accepte le 20 quand le fuseau de lâ€™utilisateur est donnÃ©', () => {
        const fields: TransactionFormFields = {
            type: 'depense',
            accountPublicId: 'acc-1',
            counterpartyAccountPublicId: '',
            label: 'Boulangerie',
            amount: '4.50',
            operationDate: '2026-11-20',
            valueDate: null,
            paymentMethodPublicId: '',
            categoryPublicId: '',
            tierPublicId: '',
            recurrencePublicId: '',
            savingsGoalPublicId: '',
            assetPublicId: '',
            tagPublicIds: []
        };
        const accounts = [{ publicId: 'acc-1', currency: 'CHF', isActive: true, myRole: 'owner' }] as never;
        expect(buildCreateTransactionPayload(fields, { accounts, now: SWISS_AFTER_MIDNIGHT, timeZone: 'Europe/Zurich' }).ok).toBe(true);
        expect(buildCreateTransactionPayload(fields, { accounts, now: SWISS_AFTER_MIDNIGHT })).toMatchObject({
            ok: false,
            code: 'operationDateFuture'
        });
    });
});

describe('lot 6c Â· catÃ©gories du formulaire (V2.5, V2.6)', () => {
    it('filtre lâ€™arbre comme lâ€™API : type demandÃ© et mixte, enfant orphelin remontÃ© Ã  plat', () => {
        const tree = [
            category('logement', 'depense', [category('loyer', 'depense')]),
            category('salaire', 'revenu', [category('bonus-courses', 'depense')]),
            category('divers', 'mixte')
        ];
        const filtered = filterCategoryTreeByType(tree, 'depense');
        const ids = filtered.map((item) => item.publicId).sort();
        expect(ids).toEqual(['bonus-courses', 'divers', 'logement']);
        expect(filtered.find((item) => item.publicId === 'logement')?.children?.map((c) => c.publicId)).toEqual(['loyer']);
    });

    it('crÃ©er une catÃ©gorie garde la liste filtrÃ©e active remplie (plus de sÃ©lecteur vidÃ©)', () => {
        const state = createCategoriesState();
        state.setList('tree', [category('logement', 'depense')]);
        state.setList('tree:depense', [category('logement', 'depense')]);
        state.activateList('tree:depense');

        state.upsertItem(category('courses', 'depense'));

        expect(state.items.value.map((item) => item.publicId).sort()).toEqual(['courses', 'logement']);
        expect(state.tree.value.map((item) => item.publicId).sort()).toEqual(['courses', 'logement']);
    });
});

describe('lot 6c Â· quantitÃ©s en notation dÃ©cimale (V5.7)', () => {
    it('jamais dâ€™exposant, zÃ©ros de fin retirÃ©s', () => {
        expect(toPlainDecimalString(5e-7)).toBe('0.0000005');
        expect(toPlainDecimalString(0.000000000001)).toBe('0.000000000001');
        expect(toPlainDecimalString(1250.5)).toBe('1250.5');
        expect(toPlainDecimalString(0)).toBe('0');
        expect(toPlainDecimalString(-0.25)).toBe('-0.25');
    });
});

describe('lot 6c Â· relance du temps rÃ©el (V4.1)', () => {
    it('dÃ©lai croissant, plafonnÃ© Ã  5 minutes', () => {
        expect(hubRestartDelayMs(0)).toBe(5_000);
        expect(hubRestartDelayMs(1)).toBe(10_000);
        expect(hubRestartDelayMs(3)).toBe(40_000);
        expect(hubRestartDelayMs(20)).toBe(300_000);
    });
});

describe('lot 6c Â· la dÃ©mo nâ€™Ã©crit rien sur lâ€™appareil (V6.4)', () => {
    afterEach(() => {
        clearDemoSession();
        clearDemoDeviceStorage();
        localStorage.clear();
    });

    it('en dÃ©mo, les prÃ©fÃ©rences restent en mÃ©moire et la rÃ©initialisation les efface', () => {
        markDemoSession();
        deviceStorage.setItem('spendup.tax.validated.TAX2026', '["income"]');
        expect(deviceStorage.getItem('spendup.tax.validated.TAX2026')).toBe('["income"]');
        expect(localStorage.getItem('spendup.tax.validated.TAX2026')).toBeNull();

        clearDemoDeviceStorage();
        expect(deviceStorage.getItem('spendup.tax.validated.TAX2026')).toBeNull();
    });

    it('hors dÃ©mo, câ€™est le localStorage habituel', () => {
        deviceStorage.setItem('spendup.tax.guided-dismissed', '["T1"]');
        expect(localStorage.getItem('spendup.tax.guided-dismissed')).toBe('["T1"]');
    });
});

describe('lot 6c Â· onglet dupliquÃ© (V1.5)', () => {
    afterEach(() => {
        sessionStorage.removeItem(TOKEN_CHAIN_KEY);
    });

    it('les jetons rotÃ©s sont transmis aux onglets de la mÃªme chaÃ®ne, pas aux autres', async () => {
        if (typeof BroadcastChannel === 'undefined') return;
        sessionStorage.setItem(TOKEN_CHAIN_KEY, 'chain-A');
        const received: AuthTokens[] = [];
        const sender = createTokenBroadcast(() => undefined);
        const receiver = createTokenBroadcast((tokens) => received.push(tokens));
        try {
            sender.publish({ accessToken: 'a2', refreshToken: 'r2', expiresAt: null } as unknown as AuthTokens);
            await new Promise((resolve) => setTimeout(resolve, 30));
            expect(received.map((t) => t.refreshToken)).toEqual(['r2']);

            // une autre session (autre chaÃ®ne) n'adopte pas ces jetons
            sessionStorage.setItem(TOKEN_CHAIN_KEY, 'chain-B');
            const other = createTokenBroadcast(() => undefined);
            other.publish({ accessToken: 'x', refreshToken: 'rx', expiresAt: null } as unknown as AuthTokens);
            other.close();
            sessionStorage.setItem(TOKEN_CHAIN_KEY, 'chain-A');
            await new Promise((resolve) => setTimeout(resolve, 30));
            expect(received.map((t) => t.refreshToken)).toEqual(['r2']);
        } finally {
            sender.close();
            receiver.close();
        }
    });
});
