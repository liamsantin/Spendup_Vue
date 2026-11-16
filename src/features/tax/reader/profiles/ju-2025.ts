import type { FormProfile, ProfileLine, ReaderSection, TotalRule } from '../types';

const line = (code: string, section: ReaderSection, label: string, target: string | null, sign?: 1 | -1): ProfileLine => ({
    code,
    section,
    label,
    target,
    ...(sign ? { sign } : {})
});

/** Codes de revenu, avec leur imputation sur le catalogue de l'application. */
const INCOME: ProfileLine[] = [
    line('100', 'income', 'Salaire net', 'income.employed'),
    line('105', 'income', 'Revenu en nature, part privée aux frais généraux', 'income.employed'),
    line('110', 'income', 'Gain accessoire net', 'income.employed'),
    line('120', 'income', 'Indemnités journalières AI', 'income.disabilityPension'),
    line('130', 'income', "Jetons de présence, honoraires d'administrateur", 'income.employed'),
    line('140', 'income', "Résultat de l'activité indépendante", 'income.selfEmployed'),
    line('150', 'income', "Résultat de l'activité agricole et forestière", 'income.selfEmployed'),
    line('160', 'income', 'Résultat de société simple, en nom collectif ou en commandite', 'income.selfEmployed'),
    line('170', 'income', "Résultat de l'activité accessoire indépendante", 'income.selfEmployed'),
    line('180', 'income', 'Pertes commerciales non absorbées', 'income.selfEmployed', -1),
    line('182', 'income', 'Cotisations personnelles AVS / AI / APG', 'income.selfEmployed', -1),
    line('184', 'income', 'Rendement de titres compris dans le compte de pertes et profits', 'income.selfEmployed', -1),
    line('186', 'income', 'Cotisations personnelles au 3e pilier', 'income.selfEmployed'),
    line('188', 'income', "Gain de liquidation compris dans le résultat d'activité", 'income.selfEmployed', -1),
    line('190', 'income', 'Allocations familiales pour indépendants / agriculteurs', 'income.selfEmployed'),
    line('200', 'income', 'Rente AVS', 'income.retirementPension'),
    line('210', 'income', 'Rente AI', 'income.disabilityPension'),
    line('220', 'income', 'Pensions et rentes de la prévoyance professionnelle', 'income.other'),
    line('230', 'income', "Indemnités de l'assurance-chômage", 'income.unemployment'),
    line('240', 'income', 'Autres rentes et prestations', 'income.other'),
    line('250', 'income', 'Pensions alimentaires reçues, part de l’adulte', 'income.alimony'),
    line('260', 'income', 'Pensions alimentaires reçues, part des enfants', 'income.alimony'),
    line('300', 'income', 'Rendement net de la fortune immobilière privée', 'income.property'),
    line('310', 'income', 'Excédent de dépenses de la fortune immobilière privée', 'income.property', -1),
    line('320', 'income', 'Rendement net de la fortune immobilière commerciale', 'income.property'),
    line('330', 'income', 'Excédent de dépenses de la fortune immobilière commerciale', 'income.property', -1),
    line('340', 'income', "Rendement de titres ou d'autres placements de capitaux", 'income.securities'),
    line('350', 'income', "Rendement de titres ou d'autres placements dans l'entreprise", 'income.securities'),
    line('360', 'income', "Droit d'habitation", 'income.other'),
    line('370', 'income', 'Rentes viagères, entretien viager', 'income.other'),
    line('380', 'income', 'Revenu net de successions non partagées, copropriétés', 'income.other'),
    line('390', 'income', 'Excédent de dépenses de successions non partagées', 'income.other', -1),
    line('400', 'income', 'Autres revenus', 'income.other')
];

const DEDUCTIONS: ProfileLine[] = [
    line('500', 'deduction', "Frais d'obtention du revenu salarié", 'deduction.jobExpenses'),
    line('505', 'deduction', "Déduction en cas d'activité des deux conjoints", 'deduction.other'),
    line('510', 'deduction', 'Cotisations AVS / AI / LPP des personnes non actives', 'deduction.other'),
    line('515', 'deduction', "Rachat d'années d'assurance (2e pilier)", 'deduction.pillar2BuyIn'),
    line('520', 'deduction', 'Prévoyance individuelle liée (pilier 3a)', 'deduction.pillar3a'),
    line('525', 'deduction', "Primes d'assurances et intérêts d'épargne (total déductible)", 'deduction.insurance'),
    line('530', 'deduction', 'Intérêts passifs privés', 'deduction.debtInterest'),
    line('535', 'deduction', 'Intérêts passifs commerciaux / agricoles', 'deduction.debtInterest'),
    line('540', 'deduction', 'Pensions alimentaires versées, part de l’adulte', 'deduction.other'),
    line('545', 'deduction', 'Pensions alimentaires versées, part des enfants', 'deduction.other'),
    line('548', 'deduction', 'Cotisations en faveur d’un parti politique', 'deduction.other'),
    line('549', 'deduction', 'Frais de formation, de perfectionnement et de reconversion', 'deduction.education'),
    line('550', 'deduction', 'Frais liés au handicap', 'deduction.handicap'),
    line('555', 'deduction', 'Frais de garde', 'deduction.childcare'),
    line('580', 'deduction', 'Frais de maladie (solde déductible)', 'deduction.health'),
    line('585', 'deduction', 'Dons', 'deduction.donations'),
    line('600', 'deduction', 'Ménage indépendant, sans enfant à charge', 'deduction.social'),
    line('610', 'deduction', 'Activité exercée par une personne seule avec enfant à charge', 'deduction.social'),
    line('620', 'deduction', 'Enfants à charge', 'deduction.social'),
    line('630', 'deduction', 'Supplément pour enfants instruits au-dehors', 'deduction.social'),
    line('640', 'deduction', 'Personnes secourues', 'deduction.social'),
    line('660', 'deduction', 'Apprenti et étudiant', 'deduction.social'),
    line('670', 'deduction', 'Personnes âgées ou infirmes', 'deduction.social'),
    line('680', 'deduction', 'Couples mariés ou partenariat enregistré', 'deduction.social')
];

const ASSETS: ProfileLine[] = [
    line('700', 'asset', 'Biens fonciers dans la commune de domicile', 'asset.property'),
    line('702', 'asset', "Biens fonciers dans d'autres communes jurassiennes", 'asset.property'),
    line('708', 'asset', 'Immeubles commerciaux', 'asset.property'),
    line('710', 'asset', 'Immeubles agricoles', 'asset.property'),
    line('720', 'asset', 'Bétail', 'asset.other'),
    line('725', 'asset', "Matériel d'exploitation agricole", 'asset.other'),
    line('730', 'asset', "Matériel d'exploitation non agricole", 'asset.other'),
    line('735', 'asset', 'Autres actifs commerciaux', 'asset.other'),
    line('740', 'asset', 'Titres et autres placements de capitaux', 'asset.cashAndSecurities'),
    line('745', 'asset', "Titres et placements engagés dans l'entreprise", 'asset.cashAndSecurities'),
    line('750', 'asset', 'Fortune placée dans des sociétés de personnes', 'asset.other'),
    line('755', 'asset', 'Fortune nette de successions non partagées, copropriétés', 'asset.other'),
    line('760', 'asset', 'Véhicules privés (valeur résiduelle)', 'asset.other'),
    line('770', 'asset', 'Assurances sur la vie avec valeur de rachat', 'asset.other'),
    line('780', 'asset', 'Autre fortune (numéraire, métaux précieux, collections)', 'asset.other'),
    line('800', 'liability', 'Dettes hypothécaires et autres dettes privées', 'liability.debts'),
    line('810', 'liability', 'Dettes hypothécaires et autres dettes commerciales / agricoles', 'liability.debts'),
    line('820', 'liability', 'Excédent de dettes de successions non partagées, copropriétés', 'liability.debts'),
    line('860', 'asset', 'Déduction générale sur la fortune', 'asset.generalDeduction'),
    line('870', 'asset', 'Déduction pour enfants sur la fortune', 'asset.generalDeduction'),
    line('892', 'other', 'Fortune immobilière dans d’autres cantons', null),
    line('894', 'other', 'Fortune immobilière à l’étranger', null),
    line('905', 'other', 'Prestations en capital touchées', null),
    line('915', 'other', 'Investissement dans des entreprises innovantes', null)
];

const codes = (list: ProfileLine[]) => list.map((item) => item.code);

const INCOME_CODES = codes(INCOME);
const DEDUCTION_CODES = codes(DEDUCTIONS.filter((item) => Number(item.code) < 560));
const PERSONAL_CODES = codes(DEDUCTIONS.filter((item) => Number(item.code) >= 600));
// codes 700 à 780 : les déductions sur la fortune (860, 870) ne font pas partie de l'actif
const ASSET_CODES = codes(ASSETS.filter((item) => item.section === 'asset' && Number(item.code) <= 780));

const TOTALS: TotalRule[] = [
    { code: '480', label: 'Totaux des revenus (contribuable)', person: '1', plus: INCOME_CODES },
    { code: '480', label: 'Totaux des revenus (conjoint)', person: '2', plus: INCOME_CODES },
    { code: '490', label: 'Revenu total', person: '*', plus: ['480'] },
    { code: '560', label: 'Revenu net I', person: '*', plus: ['490'], minus: DEDUCTION_CODES },
    { code: '590', label: 'Revenu net II', person: '*', plus: ['560'], minus: ['580', '585'] },
    { code: '690', label: 'Revenu imposable', person: '*', plus: ['590'], minus: PERSONAL_CODES, floorZero: true },
    { code: '790', label: "Total de l'actif", person: '*', plus: ASSET_CODES },
    { code: '840', label: 'Fortune nette', person: '*', plus: ['790'], minus: ['800', '810', '820'] },
    { code: '890', label: 'Fortune imposable', person: '*', plus: ['840'], minus: ['860', '870'], floorZero: true }
];

/** Déclaration d'impôts du canton du Jura (JuraTax Online), formulaire imprimé de l'année fiscale 2025. */
export const JU_2025: FormProfile = {
    id: 'ju-2025',
    label: 'JuraTax 2025',
    canton: 'JU',
    year: 2025,
    detect: ['JuraTax'],
    pages: [2, 4, 5],
    layout: { codePattern: '^(\\d{3})(C?)$', persons: { kind: 'suffix', suffix: 'C' }, minusIsNegative: true },
    lines: [...INCOME, ...DEDUCTIONS, ...ASSETS],
    totals: TOTALS
};
