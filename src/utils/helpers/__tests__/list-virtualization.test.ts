import { describe, expect, it } from 'vitest';
import { LIST_VIRTUALIZE_AFTER, shouldVirtualize } from '../list-virtualization';

describe('shouldVirtualize', () => {
    it('reste faux jusqu’au seuil inclus', () => {
        expect(shouldVirtualize(LIST_VIRTUALIZE_AFTER)).toBe(false);
        expect(shouldVirtualize(LIST_VIRTUALIZE_AFTER + 1)).toBe(true);
    });
});
