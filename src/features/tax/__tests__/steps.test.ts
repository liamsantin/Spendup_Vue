import { describe, expect, it } from 'vitest';
import { TAX_GROUP_DEFINITIONS, buildTaxGroups, migrateValidatedSteps } from '@/features/tax/steps';
import type { TaxLine, TaxSection } from '@/features/tax/types';

const SECTION_OF = new Map(
    TAX_GROUP_DEFINITIONS.flatMap((definition) => definition.codes.map((code) => [code, definition.section] as const))
);

function line(code: string): TaxLine {
    return { code, label: code, splitsCompetence: false, values: [] };
}

function sectionsWith(extra: Array<{ section: string; code: string }> = []): TaxSection[] {
    const order = ['revenus', 'deductions', 'fortune', 'dettes', 'aPart'];
    const sections: TaxSection[] = order.map((code) => ({ code, label: code, lines: [] }));
    for (const [code, section] of SECTION_OF) sections.find((item) => item.code === section)!.lines.push(line(code));
    for (const item of extra) {
        let target = sections.find((section) => section.code === item.section);
        if (!target) {
            target = { code: item.section, label: item.section, lines: [] };
            sections.push(target);
        }
        target.lines.push(line(item.code));
    }
    return sections;
}

describe('étapes de la déclaration', () => {
    it('place chaque ligne dans exactement une étape, sans en perdre', () => {
        const sections = sectionsWith();
        const groups = buildTaxGroups(sections);
        const placed = groups.flatMap((group) => group.lines.map((item) => item.code));
        const expected = sections.flatMap((section) => section.lines.map((item) => item.code));
        expect([...placed].sort()).toEqual([...expected].sort());
        expect(new Set(placed).size).toBe(placed.length);
    });

    it('découpe les déductions en quatre étapes courtes', () => {
        const ids = buildTaxGroups(sectionsWith()).map((group) => group.id);
        expect(ids).toEqual(['revenus', 'prevoyance', 'assurances', 'famille', 'autres', 'fortune', 'dettes', 'aPart']);
        for (const group of buildTaxGroups(sectionsWith())) expect(group.lines.length).toBeLessThanOrEqual(12);
    });

    it('range une ligne nouvelle dans la dernière étape de sa section', () => {
        const groups = buildTaxGroups(sectionsWith([{ section: 'deductions', code: 'deduction.future' }]));
        expect(groups.find((group) => group.id === 'autres')?.lines.some((item) => item.code === 'deduction.future')).toBe(true);
    });

    it('crée une étape pour une section que l’écran ne connaît pas', () => {
        const groups = buildTaxGroups(sectionsWith([{ section: 'bonus', code: 'bonus.one' }]));
        expect(groups.at(-1)).toMatchObject({ id: 'bonus' });
        expect(groups.at(-1)?.lines.map((item) => item.code)).toEqual(['bonus.one']);
    });

    it('reprend les anciennes validations des déductions sur les quatre nouvelles étapes', () => {
        expect([...migrateValidatedSteps(['situation', 'deductions'])].sort()).toEqual(
            ['assurances', 'autres', 'famille', 'prevoyance', 'situation'].sort()
        );
        expect(migrateValidatedSteps(['revenus'])).toEqual(['revenus']);
    });
});
