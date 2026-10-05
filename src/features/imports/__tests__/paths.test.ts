import { describe, expect, it } from 'vitest';
import { IMPORTS_PATHS, importDetailPath, importPublicIdFromPath } from '@/features/imports/paths';

describe('imports paths', () => {
    it('construit le détail et relit le publicId', () => {
        expect(IMPORTS_PATHS.list).toBe('/app/finances/imports');
        expect(importDetailPath('guid-1')).toBe('/app/finances/imports/guid-1');
        expect(importDetailPath(' ')).toBe('/app/finances/imports');
        expect(importPublicIdFromPath('/app/finances/imports')).toBeNull();
        expect(importPublicIdFromPath('/app/finances/imports/modeles')).toBeNull();
        expect(importPublicIdFromPath('/app/finances/imports/guid-1?status=erreur')).toBe('guid-1');
    });
});
