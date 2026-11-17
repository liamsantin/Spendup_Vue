import type { TaxLine, TaxSection } from '@/features/tax/types';

/**
 * Étapes de la déclaration. L'API range les lignes en cinq sections ; l'écran les redécoupe par thème
 * pour que chaque étape reste courte. Toutes les lignes sont toujours affichées : ce découpage ne masque rien.
 */

export interface TaxGroupDefinition {
    id: string;
    /** Section de l'API dont les lignes alimentent cette étape. */
    section: string;
    /** Lignes de cette étape. Les lignes inconnues d'une section rejoignent sa dernière étape. */
    codes: string[];
}

export const TAX_GROUP_DEFINITIONS: TaxGroupDefinition[] = [
    {
        id: 'revenus',
        section: 'revenus',
        codes: [
            'income.employed',
            'income.selfEmployed',
            'income.liquidationProfit',
            'income.retirementPension',
            'income.disabilityPension',
            'income.unemployment',
            'income.allowances',
            'income.alimony',
            'income.securities',
            'income.withholdingTax',
            'income.property',
            'income.other'
        ]
    },
    { id: 'prevoyance', section: 'deductions', codes: ['deduction.pillar2', 'deduction.pillar2BuyIn', 'deduction.pillar3a'] },
    {
        id: 'assurances',
        section: 'deductions',
        codes: ['deduction.insurance', 'deduction.healthGross', 'deduction.healthReimbursed', 'deduction.health', 'deduction.handicap']
    },
    { id: 'famille', section: 'deductions', codes: ['deduction.childcare', 'deduction.alimonyPaid', 'deduction.social'] },
    {
        id: 'autres',
        section: 'deductions',
        codes: [
            'deduction.jobExpenses',
            'deduction.debtInterest',
            'deduction.education',
            'deduction.donations',
            'deduction.politicalContributions',
            'deduction.other'
        ]
    },
    {
        id: 'fortune',
        section: 'fortune',
        codes: [
            'asset.cashAndSecurities',
            'asset.property',
            'asset.qualifiedPrivate',
            'asset.qualifiedBusiness',
            'asset.crypto',
            'asset.other',
            'asset.generalDeduction'
        ]
    },
    { id: 'dettes', section: 'dettes', codes: ['liability.debts'] },
    {
        id: 'aPart',
        section: 'aPart',
        codes: ['capital.pillar2', 'capital.pillar3a', 'capital.vested', 'capital.other', 'gift.amount']
    }
];

export interface TaxGroup {
    id: string;
    /** Libellé de l'API, utilisé seulement pour une section que l'écran ne connaît pas. */
    fallbackLabel: string;
    lines: TaxLine[];
}

/**
 * Regroupe les lignes en étapes, dans l'ordre des définitions, puis des sections inconnues.
 * Chaque ligne de l'API se retrouve dans exactement une étape.
 */
export function buildTaxGroups(sections: TaxSection[]): TaxGroup[] {
    const groups: TaxGroup[] = TAX_GROUP_DEFINITIONS.map((definition) => ({ id: definition.id, fallbackLabel: definition.id, lines: [] }));
    const byCode = new Map<string, TaxGroup>();
    TAX_GROUP_DEFINITIONS.forEach((definition, index) => {
        definition.codes.forEach((code) => byCode.set(code, groups[index]));
    });

    for (const section of sections) {
        const known = TAX_GROUP_DEFINITIONS.map((definition, index) => ({ definition, group: groups[index] })).filter(
            ({ definition }) => definition.section === section.code
        );
        let extra: TaxGroup | null = null;
        for (const line of section.lines) {
            const target =
                byCode.get(line.code) ?? known.at(-1)?.group ?? (extra ??= { id: section.code, fallbackLabel: section.label, lines: [] });
            target.lines.push(line);
        }
        if (extra) groups.push(extra);
    }
    return groups.filter((group) => group.lines.length > 0);
}

/** Anciennes étapes mémorisées : « deductions » est maintenant découpée en quatre. */
export function migrateValidatedSteps(ids: string[]): string[] {
    if (!ids.includes('deductions')) return ids;
    const rest = ids.filter((id) => id !== 'deductions');
    return [...new Set([...rest, 'prevoyance', 'assurances', 'famille', 'autres'])];
}
