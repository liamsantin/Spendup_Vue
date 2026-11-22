import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoDb } from '@/features/demo/db';
import { handleDemoRequest } from '@/features/demo/handle';
import { TAX_PROVISION_PATH } from '@/features/tax/paths';
import { hasProvision, paidShare, type TaxProvision } from '@/features/tax/provision';
import { idsFromPath } from '@/layouts/shell/composables/useShellNav';
import DemoRoutes from '@/router/DemoRoutes';

const PROVISION = '/api/tax-returns/provision';

function provision(partial: Partial<TaxProvision> = {}): TaxProvision {
    return {
        source: 'decision',
        referenceYear: 2025,
        returnPublicId: 'r1',
        annualAmount: 9711,
        monthlyAmount: 809.25,
        paid: 0,
        remaining: 9711,
        reference: null,
        currency: 'CHF',
        ...partial
    };
}

function file() {
    handleDemoRequest('PUT', '/api/tax-returns/TAX2026', {
        canton: 'VD',
        couple: false,
        status: 'deposee',
        person1: { officialName: null, firstName: null, vn: null, municipality: null, job: null },
        person2: null
    });
}

const decision = (totalTax: number, extra: Record<string, unknown> = {}) => ({
    competence: 'cantonal',
    kind: 'assessment',
    issuedAt: '2026-06-20',
    totalTax,
    ...extra
});

describe('helpers de la provision', () => {
    it('n’affiche rien sans base', () => {
        expect(hasProvision(null)).toBe(false);
        expect(hasProvision(provision({ source: 'none', monthlyAmount: null }))).toBe(false);
        expect(hasProvision(provision())).toBe(true);
        expect(hasProvision(provision({ source: 'saisie', referenceYear: null }))).toBe(true);
    });

    it('calcule la part déjà payée, bornée entre 0 et 1', () => {
        expect(paidShare(provision({ paid: 2000, annualAmount: 8000 }))).toBe(0.25);
        expect(paidShare(provision({ paid: 99999 }))).toBe(1);
        expect(paidShare(provision({ annualAmount: null }))).toBe(0);
    });
});

describe('GET /api/tax-returns/provision en démo', () => {
    beforeEach(() => {
        resetDemoDb();
    });

    it('ne renvoie rien sans décision ni saisie', () => {
        const result = handleDemoRequest('GET', PROVISION) as TaxProvision;
        expect(result).toMatchObject({ source: 'none', monthlyAmount: null, remaining: 0 });
    });

    it('utilise le montant saisi, qu’on peut effacer', () => {
        const typed = handleDemoRequest('PUT', `${PROVISION}/reference`, { amount: 4800 }) as TaxProvision;
        expect(typed).toMatchObject({ source: 'saisie', annualAmount: 4800, monthlyAmount: 400, remaining: 4800, reference: 4800 });

        const cleared = handleDemoRequest('PUT', `${PROVISION}/reference`, { amount: null }) as TaxProvision;
        expect(cleared.source).toBe('none');
        expect(() => handleDemoRequest('PUT', `${PROVISION}/reference`, { amount: -1 })).toThrow();
    });

    it('prend la décision avant la saisie : 9 711 CHF font 809,25 CHF par mois', () => {
        handleDemoRequest('PUT', `${PROVISION}/reference`, { amount: 4800 });
        file();
        handleDemoRequest('POST', '/api/tax-returns/TAX2026/assessments', decision(6000));
        handleDemoRequest('POST', '/api/tax-returns/TAX2026/assessments', decision(3711, { competence: 'federal' }));

        const result = handleDemoRequest('GET', PROVISION) as TaxProvision;
        expect(result).toMatchObject({ source: 'decision', annualAmount: 9711, monthlyAmount: 809.25, reference: 4800 });
    });

    it('garde le document le plus récent par ressort et ignore le décompte intermédiaire', () => {
        file();
        handleDemoRequest('POST', '/api/tax-returns/TAX2026/assessments', decision(6000));
        handleDemoRequest('POST', '/api/tax-returns/TAX2026/assessments', decision(8400, { kind: 'correction', issuedAt: '2026-06-30' }));
        handleDemoRequest(
            'POST',
            '/api/tax-returns/TAX2026/assessments',
            decision(99999, { kind: 'intermediateStatement', issuedAt: '2026-07-10' })
        );

        const result = handleDemoRequest('GET', PROVISION) as TaxProvision;
        expect(result.annualAmount).toBe(8400);
        expect(result.monthlyAmount).toBe(700);
    });
});

describe('page Provision d’impôts', () => {
    it('place l’entrée dans le menu Planification, distincte de la déclaration', () => {
        expect(idsFromPath(TAX_PROVISION_PATH)).toEqual({ openId: 'planning', activeId: 'tax-provision' });
        expect(idsFromPath('/demo/planning/provision-impots').activeId).toBe('tax-provision');
        expect(idsFromPath('/app/planning/impots').activeId).toBe('tax');
    });

    it('ouvre la page dans la démo', () => {
        const page = (DemoRoutes.children ?? []).find((child) => child.path === 'planning/provision-impots');
        expect(page?.name).toBe('DemoAppTaxProvision');
        expect(String(page?.component)).not.toContain('DemoLockedPage');
    });
});
