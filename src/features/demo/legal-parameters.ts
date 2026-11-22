import type { LegalParameter, LegalParameters } from '@/features/aids/types';
import { AppError } from '@/utils/errors/app-error';

/**
 * Paramètres légaux de la démo : copie des montants 2026 du catalogue de l’API (`LegalParameterCatalogue`), sourcés et vérifiés
 * le 2026-11-21. À mettre à jour en même temps que l’API chaque novembre.
 */
const OFAS_AMOUNTS = 'https://www.bsv.admin.ch/dam/fr/sd-web/sAgdISSXenMT/f_Betr%C3%A4ge%202026.pdf';
const OFAS_SYNOPTIC = 'https://www.bsv.admin.ch/dam/fr/sd-web/pOeFN0JP-S5E/tableau-synoptique-securite-sociale-suisse.pdf';
const OFAS_FAMILY = 'https://www.bsv.admin.ch/dam/fr/sd-web/acU7RgJgeisY/Arten%20und%20Ans%C3%A4tze%20der%20Familienzulagen_2026.pdf';
const PRIMINFO = 'https://www.priminfo.admin.ch/fr/faq';
const OFSP_COST_SHARING = 'https://www.bag.admin.ch/fr/assurance-maladie-participation-aux-couts-pour-assures-domicilies-en-suisse';
const VERIFIED = '2026-11-21';
const FIRST_YEAR = 2026;

function amount(key: string, label: string, value: number, unit: string, source: string, note: string | null = null): LegalParameter {
    return { key, label, value, values: null, unit, source, verifiedAt: VERIFIED, note };
}

const ITEMS_2026: LegalParameter[] = [
    amount('pillar3aMaxWithLpp', 'Plafond 3e pilier a, affilié à une caisse de pension', 7258, 'CHF/an', OFAS_AMOUNTS),
    amount('pillar3aMaxWithoutLpp', 'Plafond 3e pilier a, sans caisse de pension', 36288, 'CHF/an', OFAS_AMOUNTS),
    amount('pillar3aRateWithoutLpp', 'Part du revenu déductible en 3e pilier a, sans caisse de pension', 20, '%', OFAS_AMOUNTS),
    amount('avsPensionMin', 'Rente de vieillesse AVS complète minimale', 1260, 'CHF/mois', OFAS_AMOUNTS),
    amount('avsPensionMax', 'Rente de vieillesse AVS complète maximale', 2520, 'CHF/mois', OFAS_AMOUNTS),
    amount('avsCoupleCap', 'Plafond des deux rentes AVS d’un couple (150 % de la rente maximale)', 3780, 'CHF/mois', OFAS_SYNOPTIC),
    amount('lppMinConversionRate', 'Taux de conversion minimal LPP (partie obligatoire)', 6.8, '%', OFAS_SYNOPTIC),
    amount('lamalOrdinaryFranchise', 'Franchise ordinaire LAMal, adulte', 300, 'CHF/an', PRIMINFO),
    {
        key: 'lamalOptionalFranchises',
        label: 'Franchises à option LAMal, adulte',
        value: null,
        values: [500, 1000, 1500, 2000, 2500],
        unit: 'CHF/an',
        source: PRIMINFO,
        verifiedAt: VERIFIED,
        note: null
    },
    amount('lamalQuotePartRate', 'Quote-part LAMal au-delà de la franchise', 10, '%', OFSP_COST_SHARING),
    amount('lamalQuotePartMaxAdult', 'Plafond annuel de la quote-part LAMal, adulte', 700, 'CHF/an', OFSP_COST_SHARING),
    amount('lamalQuotePartMaxChild', 'Plafond annuel de la quote-part LAMal, enfant', 350, 'CHF/an', OFSP_COST_SHARING),
    amount('familyAllowanceChildMin', 'Allocation pour enfant, minimum fédéral', 215, 'CHF/mois', OFAS_FAMILY),
    amount('familyAllowanceTrainingMin', 'Allocation de formation professionnelle, minimum fédéral', 268, 'CHF/mois', OFAS_FAMILY)
];

/** Même contrat que `GET /api/legal-parameters` : année demandée, année servie, repli explicite. */
export function demoLegalParameters(year: number | null): LegalParameters {
    const requested = year ?? new Date().getFullYear();
    if (!Number.isInteger(requested) || requested < 1900 || requested > 2200) {
        throw new AppError('L’année doit être comprise entre 1900 et 2200.', 400);
    }
    if (requested < FIRST_YEAR) throw new AppError(`Aucun paramètre légal avant ${FIRST_YEAR}.`, 400);
    const isFallback = requested !== FIRST_YEAR;
    return {
        requestedYear: requested,
        year: FIRST_YEAR,
        isFallback,
        notice: isFallback ? `Les valeurs de ${requested} ne sont pas encore publiées : valeurs de l’année ${FIRST_YEAR}.` : null,
        items: ITEMS_2026
    };
}
