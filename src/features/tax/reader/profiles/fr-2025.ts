import type { FormProfile, ProfileLine, ReaderSection, TotalRule } from '../types';

const line = (code: string, section: ReaderSection, label: string, target: string | null, wealthTarget?: string | null): ProfileLine => ({
    code,
    section,
    label,
    target,
    ...(wealthTarget !== undefined ? { wealthTarget } : {})
});

const INCOME: ProfileLine[] = [
    line('1.110', 'income', 'Activité salariée principale', 'income.employed'),
    line('1.120', 'income', 'Activité salariée accessoire', 'income.employed'),
    line('1.130', 'income', 'Allocations non versées par l’employeur', 'income.allowances'),
    line('1.210', 'income', 'Activité indépendante principale', 'income.selfEmployed'),
    line('1.220', 'income', 'Activité indépendante accessoire', 'income.selfEmployed'),
    line('1.310', 'income', 'Activité agricole principale et/ou accessoire', 'income.selfEmployed'),
    line('1.330', 'income', 'Allocations familiales aux petits paysans', 'income.allowances'),
    line('1.410', 'income', 'Administrateur/trice de personnes morales', 'income.other'),
    line('1.420', 'income', 'SNC / commandite', 'income.other'),
    line('1.510', 'income', 'Assurance-chômage (AC) et service militaire (APG)', 'income.unemployment'),
    line('1.520', 'income', 'Maladie et accidents (indemnités journalières)', 'income.other'),
    line('1.530', 'income', 'Assurance-invalidité (indemnités journalières)', 'income.disabilityPension'),
    line('3.110', 'income', '1er pilier : rentes AVS et AI', 'income.retirementPension'),
    line('3.120', 'income', '2e pilier : rentes de prévoyance professionnelle', 'income.other'),
    line('3.130', 'income', '3e pilier a : rentes de prévoyance individuelle liée', 'income.other'),
    line('3.140', 'income', '3e pilier b : autres rentes et pensions', 'income.other'),
    line('3.150', 'income', 'Pension alimentaire reçue', 'income.alimony'),
    line('3.210', 'income', 'Placements privés', 'income.securities', 'asset.cashAndSecurities'),
    line('3.220', 'income', 'Placements commerciaux', 'income.securities', 'asset.cashAndSecurities'),
    line('3.230', 'income', 'Numéraire, billets de banque, or et autres métaux précieux', 'income.other', 'asset.other'),
    line('3.240', 'income', 'Successions non partagées', 'income.other', 'asset.other'),
    line('3.250', 'income', 'Placements privés non cotés', 'income.securities', 'asset.cashAndSecurities'),
    line('3.310', 'income', 'Immeubles privés : valeur locative / valeur fiscale', 'income.property', 'asset.property'),
    line('3.320', 'income', 'Immeubles commerciaux : valeur locative / valeur fiscale', 'income.property', 'asset.property'),
    line('3.330', 'income', 'Immeubles agricoles : valeur locative / valeur fiscale', 'income.property', 'asset.property'),
    line('3.340', 'income', 'Loyers', 'income.property'),
    line('3.343', 'income', 'Fermages', 'income.property'),
    line('3.345', 'income', 'Valeur locative d’un droit d’habitation cédé à un tiers', 'income.property'),
    line('3.350', 'income', 'Autres rendements immobiliers', 'income.property'),
    line('3.410', 'income', 'Autres revenus (droit d’habitation, sous-location, etc.)', 'income.other'),
    line('3.510', 'asset', 'Autos, bateaux, etc.', null, 'asset.other'),
    line('3.520', 'asset', 'Assurances sur la vie et assurances de rentes', null, 'asset.other'),
    line('3.530', 'asset', 'Collections, œuvres d’art, bijoux', null, 'asset.other'),
    line('3.560', 'asset', 'Part à la fortune de sociétés en nom collectif ou en commandite', null, 'asset.other'),
    line('3.570', 'asset', 'Fortune mobilière placée dans l’exploitation', null, 'asset.other')
];

const DEDUCTIONS: ProfileLine[] = [
    line('2.110', 'deduction', 'Frais de transport', 'deduction.jobExpenses'),
    line('2.120', 'deduction', 'Repas / séjour hors domicile, travail par équipes', 'deduction.jobExpenses'),
    line('2.130', 'deduction', 'Autres frais professionnels', 'deduction.jobExpenses'),
    line('2.140', 'deduction', 'Frais pour activité accessoire salariée', 'deduction.jobExpenses'),
    line('2.510', 'deduction', 'Double activité des conjoints ou collaboration importante', 'deduction.other'),
    line('4.110', 'deduction', 'Primes caisse-maladie et accidents', 'deduction.insurance'),
    line('4.120', 'deduction', 'Autres primes et cotisations (3e pilier b)', 'deduction.insurance'),
    line('4.130', 'deduction', '3e pilier a', 'deduction.pillar3a'),
    line('4.140', 'deduction', 'Rachats d’années d’assurance (2e pilier)', 'deduction.pillar2BuyIn'),
    line('4.150', 'deduction', 'Intérêts de capitaux d’épargne', 'deduction.insurance'),
    line('4.160', 'deduction', 'Déduction du 30 % des rendements de participations qualifiées', 'deduction.other'),
    line('4.210', 'deduction', 'Intérêts de dettes privés', 'deduction.debtInterest', 'liability.debts'),
    line('4.220', 'deduction', 'Intérêts de dettes commerciaux', 'deduction.debtInterest', 'liability.debts'),
    line('4.310', 'deduction', 'Frais d’entretien d’immeubles privés', 'deduction.other'),
    line('4.311', 'deduction', 'Économie d’énergie et frais de démolition d’immeubles privés', 'deduction.other'),
    line('4.313', 'deduction', 'Frais d’entretien d’immeubles commerciaux', 'deduction.other'),
    line('4.315', 'deduction', 'Frais d’entretien d’immeubles agricoles', 'deduction.other'),
    line('4.320', 'deduction', 'Frais d’administration de titres et mises dans les loteries', 'deduction.other'),
    line('4.330', 'deduction', 'Rentes et charges durables', 'deduction.other'),
    line('4.335', 'deduction', 'Rentes et charges durables (bénéficiaire du droit)', 'deduction.other'),
    line('4.340', 'deduction', 'Pension alimentaire versée', 'deduction.other'),
    line('4.350', 'deduction', 'Cotisations AVS/AI/APG/AC d’assuré-e-s sans activité lucrative', 'deduction.other'),
    line('4.370', 'deduction', 'Frais liés au handicap', 'deduction.handicap'),
    line('4.380', 'deduction', 'Frais de garde des enfants', 'deduction.childcare'),
    line('4.410', 'deduction', 'Versements aux partis politiques', 'deduction.other'),
    line('4.420', 'deduction', 'Frais de formation et de perfectionnement', 'deduction.education'),
    line('5.110', 'deduction', 'Frais médicaux (montant déductible)', 'deduction.health'),
    line('5.120', 'deduction', 'Versements bénévoles', 'deduction.donations'),
    line('6.110', 'deduction', 'Déductions sociales pour enfants', 'deduction.social'),
    line('6.120', 'deduction', 'Autres personnes à charge', 'deduction.social'),
    line('6.130', 'deduction', 'Contribuable aux études ou en apprentissage', 'deduction.social'),
    line('6.140', 'deduction', 'Fauteuil roulant / orphelin', 'deduction.social'),
    line('6.145', 'deduction', 'Déduction sociale pour les soins à domicile', 'deduction.social'),
    // colonne revenu : contribuables à revenu modeste (sans équivalent) ; colonne fortune : déduction générale
    line('7.110', 'deduction', 'Déduction pour revenu modeste et déduction sur la fortune', null, 'asset.generalDeduction')
];

const range = (codes: string[], ...extra: string[]) => [...codes, ...extra];
const codesOf = (list: ProfileLine[], from: string, to: string) =>
    list.filter((item) => item.code >= from && item.code <= to).map((item) => item.code);

const ACTIVITY = ['1.110', '1.120', '1.130', '1.210', '1.220', '1.310', '1.330', '1.410', '1.420', '1.510', '1.520', '1.530'];
const ACQUISITION = ['2.110', '2.120', '2.130', '2.140', '2.510'];
const RENTS = ['3.110', '3.120', '3.130', '3.140', '3.150'];
const OTHER_INCOME = [...codesOf(INCOME, '3.210', '3.250'), ...codesOf(INCOME, '3.310', '3.350'), '3.410'];
const WEALTH = ['3.210', '3.220', '3.230', '3.240', '3.250', '3.310', '3.320', '3.330', '3.510', '3.520', '3.530', '3.560', '3.570'];
const DEDUCTION_CODES = codesOf(DEDUCTIONS, '4.110', '4.420');
const SOCIAL = codesOf(DEDUCTIONS, '6.110', '6.145');

/** Un total pour chaque personne : 1.910 pour la personne 1, puis pour la personne 2. */
const perPerson = (rule: Omit<TotalRule, 'person'>): TotalRule[] => [
    { ...rule, person: '1' },
    { ...rule, person: '2' }
];

const TOTALS: TotalRule[] = [
    ...perPerson({ code: '1.910', label: 'Total des revenus de l’activité', plus: ACTIVITY }),
    ...perPerson({
        code: '2.910',
        label: 'Total des revenus de l’activité moins frais d’acquisition',
        plus: ['1.910'],
        minus: ACQUISITION
    }),
    { code: '3.180', label: 'Total intermédiaire', person: '1', plus: range(['2.910'], ...RENTS) },
    { code: '3.180', label: 'Total intermédiaire (personne 2)', person: '2', plus: ['2.910'] },
    { code: '3.910', label: 'Total des revenus', person: '*', plus: range(['3.180'], ...OTHER_INCOME) },
    { code: '3.910', label: 'Total de la fortune', person: '1', column: 'wealth', plus: WEALTH },
    { code: '4.910', label: 'Revenu net', person: '*', plus: ['3.910'], minus: DEDUCTION_CODES, floorZero: true },
    {
        code: '6.910',
        label: 'Revenu après déductions',
        person: '1',
        plus: ['4.910'],
        minus: range(['5.110', '5.120'], ...SOCIAL),
        floorZero: true
    },
    { code: '6.910', label: 'Fortune après passifs', person: '1', column: 'wealth', plus: ['3.910'], minus: ['4.210', '4.220'] },
    { code: '7.910', label: 'Revenu imposable', person: '*', plus: ['6.910'], minus: ['7.110:a'], floorZero: true },
    { code: '7.910', label: 'Fortune imposable', person: '1', column: 'wealth', plus: ['6.910'], minus: ['7.110'], floorZero: true }
];

/** Déclaration d'impôts du canton de Fribourg (FriTax), formulaire imprimé de l'année fiscale 2025. */
export const FR_2025: FormProfile = {
    id: 'fr-2025',
    label: 'FriTax 2025',
    canton: 'FR',
    year: 2025,
    detect: ['FRIBOURG', 'Déclaration d.impôt', '2025'],
    pages: [4, 5],
    layout: {
        codePattern: '^(\\d\\.\\d{3})$',
        codeColumn: { min: 390, max: 410 },
        // montants alignés à droite : revenu personne 1, revenu personne 2, fortune
        persons: {
            kind: 'columns',
            // en haut de la page centrale (activité, rentes), la colonne de droite est la personne 2
            person2InWealthBandFor: '^(1|2)\\.|^3\\.1',
            columns: [
                { person: '1', kind: 'amount', minRight: 470, maxRight: 505 },
                { person: '2', kind: 'amount', minRight: 505, maxRight: 545 },
                { kind: 'wealth', minRight: 545, maxRight: 600 }
            ]
        },
        minusIsNegative: false
    },
    lines: [...INCOME, ...DEDUCTIONS],
    totals: TOTALS
};
