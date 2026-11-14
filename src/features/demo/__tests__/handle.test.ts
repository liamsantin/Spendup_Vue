import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { demoDb, resetDemoDb } from '@/features/demo/db';

describe('handleDemoRequest', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('sert le foyer de démo et filtre les transactions du mois', () => {
        const accounts = handleDemoRequest('GET', '/api/accounts') as { items: { publicId: string }[] };
        expect(accounts.items.map((item) => item.publicId)).toEqual(['ACCCOUR', 'ACCSAVE', 'ACCCASH', 'ACCINV1']);

        const november = handleDemoRequest('GET', '/api/transactions?from=2026-11-01&to=2026-11-30&page=1&pageSize=50') as {
            items: { label: string }[];
            totalCount: number;
        };
        expect(november.totalCount).toBe(6);
        expect(november.items.some((item) => item.label === 'Salaire octobre')).toBe(false);
    });

    it('crée une dépense et met à jour le solde et le budget', () => {
        const before = demoDb().accounts.find((item) => item.publicId === 'ACCCOUR')?.currentBalance ?? 0;
        const created = handleDemoRequest('POST', '/api/transactions', {
            type: 'depense',
            accountPublicId: 'ACCCOUR',
            label: 'Café',
            amount: 4.5,
            operationDate: '2026-11-14',
            categoryPublicId: 'CATFOOD'
        }) as { publicId: string; amount: number };

        expect(created.publicId).toHaveLength(7);
        expect(demoDb().accounts.find((item) => item.publicId === 'ACCCOUR')?.currentBalance).toBeCloseTo(before - 4.5);

        const budgets = handleDemoRequest('GET', '/api/budgets?isActive=true') as {
            items: { publicId: string; spentAmount: number }[];
        };
        expect(budgets.items.find((item) => item.publicId === 'BDGFOOD')?.spentAmount).toBeCloseTo(86.4 + 4.5);
    });

    it('sert les tiers banque, le référentiel et un moyen de paiement', () => {
        const banks = handleDemoRequest('GET', '/api/tiers?isBank=true&page=1&pageSize=20') as { items: { name: string }[] };
        expect(banks.items.map((item) => item.name).sort()).toEqual(['PostFinance', 'Raiffeisen', 'UBS']);

        const registry = handleDemoRequest('GET', '/api/banks?q=vaudoise&page=1&pageSize=20') as { items: { iid: string }[] };
        expect(registry.items.map((item) => item.iid)).toEqual(['00788']);

        const created = handleDemoRequest('POST', '/api/payment-methods', {
            accountPublicId: 'ACCCOUR',
            type: 'cash',
            label: 'Espèces'
        }) as { label: string };
        expect(created.label).toBe('Espèces');
    });

    it('sert des tiers variés et les récurrences du foyer', () => {
        const tiers = handleDemoRequest('GET', '/api/tiers?page=1&pageSize=50') as { items: { nature: string; name: string }[] };
        expect(tiers.items.map((item) => item.nature)).toEqual(
            expect.arrayContaining(['person', 'organization', 'administration', 'company'])
        );
        expect(tiers.items.some((item) => item.name === 'Marie Dubois')).toBe(true);

        const expenses = handleDemoRequest('GET', '/api/recurring-expenses?page=1&pageSize=20') as { items: { name: string }[] };
        expect(expenses.items.map((item) => item.name)).toEqual(expect.arrayContaining(['Loyer', 'Assurance maladie', 'Abonnement CFF']));
        const incomes = handleDemoRequest('GET', '/api/recurring-incomes?page=1&pageSize=20') as {
            items: { name: string; tierPublicId: string | null }[];
        };
        expect(incomes.items.find((item) => item.name === 'Salaire')?.tierPublicId).toBe('TIEREMP');
    });

    it('liste des amis et en trouve d’autres dans la recherche', () => {
        const friends = handleDemoRequest('GET', '/api/friends?page=1&pageSize=20') as { items: { user: { firstName: string } }[] };
        expect(friends.items.map((item) => item.user.firstName).sort()).toEqual(['Adam', 'Chloé', 'Marc']);

        const incoming = handleDemoRequest('GET', '/api/friends/requests/incoming?page=1&pageSize=20') as { totalCount: number };
        expect(incoming.totalCount).toBe(2);

        const found = handleDemoRequest('GET', '/api/friends/search?q=lea&page=1&pageSize=20') as {
            items: { firstName: string; friendshipStatus: string | null }[];
        };
        expect(found.items.map((item) => item.firstName)).toEqual(['Léa']);
        expect(found.items[0]?.friendshipStatus).toBeNull();

        const known = handleDemoRequest('GET', '/api/friends/search?q=chlo&page=1&pageSize=20') as {
            items: { friendshipStatus: string | null }[];
        };
        expect(known.items[0]?.friendshipStatus).toBe('accepted');
    });

    it('accepte trois fichiers puis refuse le quatrième', () => {
        function upload(name: string) {
            const form = new FormData();
            form.append('file', new File(['%PDF-1.4'], name, { type: 'application/pdf' }));
            return handleDemoRequest('POST', '/api/files', form) as { publicId: string; nameOriginal: string };
        }

        const first = upload('loyer.pdf');
        upload('facture.pdf');
        upload('contrat.pdf');
        expect(first.nameOriginal).toBe('loyer.pdf');
        const usage = handleDemoRequest('GET', '/api/files/usage') as { fileCount: number; remainingBytes: number };
        expect(usage.fileCount).toBe(3);
        expect(usage.remainingBytes).toBe(0);
        expect(() => upload('trop.pdf')).toThrow(/quota/i);

        const content = handleDemoRequest('GET', `/api/files/${first.publicId}/content`);
        expect(content).toBeInstanceOf(Blob);
    });

    it('ouvre le patrimoine : dettes, placements et immobilier', () => {
        const debts = handleDemoRequest('GET', '/api/liabilities') as { items: { name: string }[] };
        expect(debts.items.map((item) => item.name)).toEqual(expect.arrayContaining(['Hypothèque Lausanne', 'Leasing Golf']));

        const positions = handleDemoRequest('GET', '/api/accounts/ACCINV1/positions') as { items: { instrument: { symbol: string } }[] };
        expect(positions.items.map((item) => item.instrument.symbol).sort()).toEqual(['CHSPI', 'NESN']);

        const units = handleDemoRequest('GET', '/api/assets/ASTFLAT/real-estate/units') as { items: { name: string }[] };
        expect(units.items.map((item) => item.name)).toEqual(['Appartement']);

        const loans = handleDemoRequest('GET', '/api/personal-loans') as { items: { counterpartName: string | null }[] };
        expect(loans.items[0]?.counterpartName).toBe('Marie Dubois');
    });

    it('crée un véhicule et enregistre un relevé', () => {
        const created = handleDemoRequest('POST', '/api/assets', {
            name: 'Vélo cargo',
            type: 'vehicule',
            estimatedValue: 2200,
            currency: 'CHF',
            vehicle: {
                brand: 'Riese',
                model: 'Load',
                vehicleType: 'velo',
                fuel: null,
                firstRegistrationYear: 2024,
                plate: null,
                currentMileage: 400
            }
        }) as { publicId: string; type: string; vehicle: { currentMileage: number | null } };

        expect(created.type).toBe('vehicule');
        handleDemoRequest('POST', `/api/assets/${created.publicId}/vehicle/mileages`, {
            statementDate: '2026-11-14',
            kilometrage: 860
        });
        const again = handleDemoRequest('GET', `/api/assets/${created.publicId}`) as {
            vehicle: { currentMileage: number | null };
            estimatedValue: number;
        };
        expect(again.vehicle.currentMileage).toBe(860);

        handleDemoRequest('POST', `/api/assets/${created.publicId}/valuations`, {
            valuationDate: '2026-11-14',
            value: 2000
        });
        const valued = handleDemoRequest('GET', `/api/assets/${created.publicId}`) as { estimatedValue: number };
        expect(valued.estimatedValue).toBe(2000);
    });
});
