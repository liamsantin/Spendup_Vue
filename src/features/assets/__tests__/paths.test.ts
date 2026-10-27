import { describe, expect, it } from 'vitest';
import { ASSETS_PATHS, assetDetailPath, assetPublicIdFromPath } from '@/features/assets/paths';

describe('assets paths', () => {
    it('construit le détail et relit le publicId', () => {
        expect(ASSETS_PATHS.list).toBe('/app/patrimoine/actifs');
        expect(assetDetailPath('guid-1')).toBe('/app/patrimoine/actifs/guid-1');
        expect(assetDetailPath('  ')).toBe('/app/patrimoine/actifs');
        expect(assetPublicIdFromPath('/app/patrimoine/actifs')).toBeNull();
        expect(assetPublicIdFromPath('/app/patrimoine/actifs/')).toBeNull();
        expect(assetPublicIdFromPath('/app/patrimoine/actifs/guid-1')).toBe('guid-1');
        expect(assetPublicIdFromPath('/app/patrimoine/actifs/guid-1?x=1')).toBe('guid-1');
        expect(assetPublicIdFromPath('/app/patrimoine/immobilier/guid-1')).toBeNull();
    });
});
