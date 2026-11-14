import { describe, expect, it } from 'vitest';
import { TAX_BASE, taxDetailPath, taxPublicIdFromPath } from '../paths';

describe('tax paths', () => {
    it('construit le détail et le relit, y compris sous /demo', () => {
        const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        expect(taxDetailPath(id)).toBe(`${TAX_BASE}/${id}`);
        expect(taxPublicIdFromPath(taxDetailPath(id))).toBe(id);
        expect(taxPublicIdFromPath(`/demo/analyses/impots/${id}`)).toBe(id);
        expect(taxPublicIdFromPath(TAX_BASE)).toBeNull();
    });
});
