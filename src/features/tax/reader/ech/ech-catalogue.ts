/**
 * Dictionnaire des champs de montant de la norme nationale eCH-0278 (déclaration d'impôts des personnes physiques) :
 * nom standard, libellés français / allemand / italien, personnes concernées, ressort. Il sert de langue commune
 * entre les formulaires cantonaux et les lignes de Spend.Up. Données générées par `scripts/build-ech-dictionary.mjs`.
 */

export interface EchField {
    field: string;
    path: string;
    section: string;
    de: string;
    fr: string;
    it: string;
    descriptionFr: string;
    person1: boolean;
    person2: boolean;
    cantonal: boolean;
    federal: boolean;
}

export interface EchDictionary {
    source: string;
    fields: EchField[];
}

/** Chargé à la demande : le dictionnaire pèse environ 160 Ko. */
export async function loadEchDictionary(): Promise<EchDictionary> {
    const module = await import('./ech-0278-fields.json');
    return module.default as EchDictionary;
}

/**
 * Pour chaque ligne du catalogue de l'application, les champs de montant eCH qui la décrivent.
 * Une ligne peut en regrouper plusieurs ; une liste vide signifie que la norme n'a pas de champ de montant équivalent.
 */
export const CATALOGUE_ECH_FIELDS: Record<string, string[]> = {
    'income.employed': ['employedRevenueTotal'],
    'income.selfEmployed': ['selfEmployedRevenueTotal'],
    'income.liquidationProfit': ['liquidationProfit'],
    'income.retirementPension': ['retirementPension'],
    'income.disabilityPension': ['incapacityPension'],
    'income.unemployment': ['unemploymentInsurance'],
    'income.allowances': ['childAndFamilyAllowancesAmount'],
    'income.alimony': ['restRevenueAlimonyChildAmount'],
    'income.securities': ['securitiesRevenue'],
    'income.withholdingTax': [],
    'income.property': ['propertyTotalIncome', 'propertyRentalValue'],
    'income.other': ['otherPensions', 'otherCompensations', 'occupationalPension', 'pillar3aPension', 'pillar3bPension'],
    'deduction.jobExpenses': ['jobExpenses'],
    'deduction.debtInterest': ['totalAmountLiabilitiesInterests'],
    'deduction.pillar2': [],
    'deduction.pillar2BuyIn': [],
    'deduction.pillar3a': [],
    'deduction.insurance': ['insurancePremium', 'totalEffectiveInsuranceContributions', 'savingsInterest'],
    'deduction.healthGross': ['healthAccidentGrossCosts'],
    'deduction.healthReimbursed': [],
    'deduction.health': ['totalDeductibleHealthAccidentCosts'],
    'deduction.handicap': ['totalDeductibleDisabilityCosts'],
    'deduction.education': ['educationAndTrainingCostsAmount', 'deductionFurtherEducationCost'],
    'deduction.donations': ['totalDonations'],
    'deduction.childcare': ['deductionNonparentalChildCareAmount'],
    'deduction.social': ['children', 'homeChild', 'externalChild', 'supportedPerson', 'deductionMarriedCouple', 'singleNoChildren'],
    'deduction.alimonyPaid': ['paymentAlimonyAmount', 'paymentAlimonyChildAmount'],
    'deduction.other': ['otherDeductionsAmount'],
    'asset.cashAndSecurities': ['totalTaxableBalanceAssetsAndSecurities'],
    'asset.property': ['totalPropertyTaxValues'],
    'asset.qualifiedPrivate': ['qualifiedInvestmentsPrivate'],
    'asset.qualifiedBusiness': ['qualifiedInvestmentsBusiness'],
    'asset.crypto': ['cryptoAssetsAmount'],
    'asset.other': ['motorVehiclesAmount', 'movableHouseholdAssetsAmount', 'cashAndPreciousMetalsAmount'],
    'asset.generalDeduction': [],
    'liability.debts': ['totalAmountLiabilities'],
    'capital.pillar2': ['capitalBenefitsPensionFundAmount'],
    'capital.pillar3a': ['capitalBenefitsPillar3aAmount'],
    'capital.vested': ['capitalBenefitsVestedAccountAmount'],
    'capital.other': ['capitalBenefitsOtherAmount', 'capitalBenefitsAHVIVAmount', 'capitalBenefitsEmploymentRelatedAmount'],
    'gift.amount': ['giftAmount']
};

export type EchLanguage = 'fr' | 'de' | 'it';

const STOP_WORDS = new Set([
    'de',
    'du',
    'des',
    'la',
    'le',
    'les',
    'et',
    'en',
    'au',
    'aux',
    'un',
    'une',
    'sur',
    'par',
    'pour',
    'total',
    'montant',
    'der',
    'die',
    'das',
    'und',
    'von',
    'für',
    'fur',
    'del',
    'della',
    'dei',
    'per',
    'con',
    'totale',
    'importo'
]);

/** Minuscules, sans accents ni ponctuation, mots utiles seulement, pluriels ramenés au singulier. */
export function labelTokens(label: string): string[] {
    return label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
        .map((word) => word.replace(/(s|x)$/, ''));
}

export interface TargetSuggestion {
    /** Ligne du catalogue de Spend.Up. */
    target: string;
    /** Champ eCH dont le libellé ressemble le plus. */
    field: string;
    /** Part des mots du libellé présents dans celui du champ, entre 0 et 1. */
    score: number;
}

/**
 * Propose les lignes de Spend.Up qui correspondent à un libellé de formulaire cantonal, en le comparant aux libellés de
 * la norme nationale. Pour le mode assisté : les propositions sont à valider par l'utilisateur, jamais appliquées seules.
 */
export function suggestTargets(label: string, dictionary: EchDictionary, language: EchLanguage = 'fr', limit = 3): TargetSuggestion[] {
    const wanted = new Set(labelTokens(label));
    if (!wanted.size) return [];
    const byField = new Map<string, EchField[]>();
    for (const field of dictionary.fields) byField.set(field.field, [...(byField.get(field.field) ?? []), field]);

    const best = new Map<string, TargetSuggestion>();
    for (const [target, names] of Object.entries(CATALOGUE_ECH_FIELDS)) {
        for (const name of names) {
            for (const field of byField.get(name) ?? []) {
                const tokens = new Set(labelTokens(field[language]));
                if (!tokens.size) continue;
                const shared = [...wanted].filter((token) => tokens.has(token)).length;
                // part des mots demandés retrouvés, légèrement pénalisée si le champ a beaucoup d'autres mots
                const score = (shared / wanted.size) * (shared / Math.max(tokens.size, wanted.size)) ** 0.5;
                if (score > (best.get(target)?.score ?? 0)) best.set(target, { target, field: name, score: Math.round(score * 100) / 100 });
            }
        }
    }
    return [...best.values()]
        .filter((entry) => entry.score >= 0.35)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
