import { beforeEach, describe, expect, it } from 'vitest';
import { handleDemoRequest } from '@/features/demo/handle';
import { resetDemoDb } from '@/features/demo/db';
import {
    buildCreateExpensePayload,
    emptyRecurringForm,
    isExpenseFormDirty,
    type RecurringTemplateFormFields
} from '@/features/recurring-payments/payload';
import {
    DEDUCTIBLE_INSURANCE_TYPES,
    INSURANCE_TYPES,
    insuranceTaxNature,
    type RecurringExpense
} from '@/features/recurring-payments/types';
import { taxSuggestionTargets } from '@/features/tax/paths';
import type { Account } from '@/features/accounts/types';

const ctx = {
    accounts: [{ publicId: 'acc-1', isActive: true, myRole: 'owner' }] as Pick<Account, 'publicId' | 'isActive' | 'myRole'>[],
    now: new Date('2026-11-17T10:00:00Z')
};

function fields(partial: Partial<RecurringTemplateFormFields> = {}): RecurringTemplateFormFields {
    return {
        ...emptyRecurringForm('expense', 'acc-1'),
        name: 'Assurance maladie',
        expenseType: 'assurance',
        plannedAmount: '385.20',
        startDate: '2026-01-01',
        ...partial
    };
}

describe('fiche d’assurance d’une charge récurrente', () => {
    it('déduit la nature fiscale du type, comme l’API', () => {
        for (const type of INSURANCE_TYPES) {
            const deductible = (DEDUCTIBLE_INSURANCE_TYPES as readonly string[]).includes(type);
            expect(insuranceTaxNature(type) !== null).toBe(deductible);
        }
        expect(insuranceTaxNature('healthBasic')).toBe('healthInsurancePremium');
        expect(insuranceTaxNature('accident')).toBe('lifeInsurancePremium');
        expect(insuranceTaxNature('householdLiability')).toBeNull();
        expect(insuranceTaxNature('')).toBeNull();
    });

    it('envoie la fiche pour une assurance, jamais pour une autre charge', () => {
        const withSheet = buildCreateExpensePayload(
            fields({
                insuranceType: 'healthBasic',
                insuranceGrossPremium: '445.20',
                insurancePremiumSubsidy: '60',
                insuranceFranchise: '2500',
                insurancePolicyNumber: '  756.1234  '
            }),
            ctx
        );
        expect(withSheet.ok && withSheet.payload.insurance).toEqual({
            insuranceType: 'healthBasic',
            renewalDate: null,
            franchise: 2500,
            grossPremium: 445.2,
            premiumSubsidy: 60,
            policyNumber: '756.1234'
        });

        const other = buildCreateExpensePayload(fields({ expenseType: 'abonnement', insuranceType: 'healthBasic' }), ctx);
        expect(other.ok && 'insurance' in other.payload).toBe(false);
    });

    it('rien n’est obligatoire : une assurance sans fiche envoie une fiche vide', () => {
        const built = buildCreateExpensePayload(fields(), ctx);
        expect(built.ok && built.payload.insurance).toEqual({
            insuranceType: null,
            renewalDate: null,
            franchise: null,
            grossPremium: null,
            premiumSubsidy: null,
            policyNumber: null
        });
    });

    it('refuse un montant illisible ou négatif, et un subside supérieur à la prime brute', () => {
        const invalid = buildCreateExpensePayload(fields({ insuranceGrossPremium: 'abc' }), ctx);
        expect(invalid).toMatchObject({ ok: false, code: 'insuranceAmountInvalid', field: 'insuranceGrossPremium' });

        const negative = buildCreateExpensePayload(fields({ insuranceFranchise: '-5' }), ctx);
        expect(negative).toMatchObject({ ok: false, code: 'insuranceAmountInvalid', field: 'insuranceFranchise' });

        const tooHigh = buildCreateExpensePayload(fields({ insuranceGrossPremium: '100', insurancePremiumSubsidy: '150' }), ctx);
        expect(tooHigh).toMatchObject({ ok: false, code: 'insuranceSubsidyTooHigh', field: 'insurancePremiumSubsidy' });
    });

    it('le formulaire est modifié quand la fiche change, pas quand elle est identique', () => {
        const current = {
            name: 'Assurance maladie',
            expenseType: 'assurance',
            frequency: 'mensuel',
            plannedAmount: 385.2,
            startDate: '2026-01-01',
            endDate: null,
            isActive: true,
            accountPublicId: 'acc-1',
            paymentMethodPublicId: null,
            categoryPublicId: null,
            tierPublicId: null,
            tagPublicIds: [],
            notes: null,
            insurance: { insuranceType: 'healthBasic', renewalDate: null, franchise: 2500, grossPremium: 445.2, premiumSubsidy: 60 }
        };
        const same = fields({
            insuranceType: 'healthBasic',
            insuranceFranchise: '2500',
            insuranceGrossPremium: '445.2',
            insurancePremiumSubsidy: '60'
        });
        expect(isExpenseFormDirty(current, same)).toBe(false);
        expect(isExpenseFormDirty(current, { ...same, insuranceType: 'life' })).toBe(true);
        expect(isExpenseFormDirty(current, { ...same, insurancePremiumSubsidy: '70' })).toBe(true);
    });

    it('le lien « Voir » d’une suggestion de primes ouvre la fiche de la charge', () => {
        const targets = taxSuggestionTargets({
            code: 'deduction.insurance',
            source: 'recurringExpense',
            sources: [{ publicId: 'REXCSS1', name: 'Assurance maladie' }]
        });
        expect(targets).toHaveLength(1);
        expect(targets[0]?.path).toContain('/charges/REXCSS1');

        const list = taxSuggestionTargets({ code: 'deduction.insurance', source: 'recurringExpense', sources: [] });
        expect(list[0]?.path).toContain('/charges');
    });
});

describe('fiche d’assurance en mode démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('l’assurance maladie de démo porte une fiche avec sa nature fiscale', () => {
        const expense = handleDemoRequest('GET', '/api/recurring-expenses/REXCSS1') as RecurringExpense;
        expect(expense.insurance).toMatchObject({
            insuranceType: 'healthBasic',
            grossPremium: 445.2,
            premiumSubsidy: 60,
            taxNature: 'healthInsurancePremium'
        });
    });

    it('un PUT sans fiche la conserve ; changer le type change la nature ; une autre charge n’en a pas', () => {
        const base = handleDemoRequest('GET', '/api/recurring-expenses/REXCSS1') as RecurringExpense;
        const body = {
            name: base.name,
            expenseType: 'assurance',
            frequency: base.frequency,
            plannedAmount: base.plannedAmount,
            startDate: base.startDate,
            endDate: null,
            isActive: true,
            accountPublicId: base.accountPublicId,
            paymentMethodPublicId: base.paymentMethodPublicId,
            categoryPublicId: null,
            tierPublicId: base.tierPublicId,
            notes: null,
            tagPublicIds: []
        };
        const kept = handleDemoRequest('PUT', '/api/recurring-expenses/REXCSS1', body) as RecurringExpense;
        expect(kept.insurance?.insuranceType).toBe('healthBasic');

        const changed = handleDemoRequest('PUT', '/api/recurring-expenses/REXCSS1', {
            ...body,
            insurance: { insuranceType: 'householdLiability', renewalDate: null, franchise: null, grossPremium: null, premiumSubsidy: null }
        }) as RecurringExpense;
        expect(changed.insurance).toMatchObject({ insuranceType: 'householdLiability', taxNature: null });

        const moved = handleDemoRequest('PUT', '/api/recurring-expenses/REXCSS1', { ...body, expenseType: 'service' }) as RecurringExpense;
        expect(moved.insurance).toBeNull();
    });
});
