import { describe, expect, it } from 'vitest';
import { crossHref, stripDemoPrefix } from '../app-target';

describe('stripDemoPrefix', () => {
    it('retire le préfixe /demo', () => {
        expect(stripDemoPrefix('/demo')).toBe('/');
        expect(stripDemoPrefix('/demo/finances/comptes')).toBe('/finances/comptes');
        expect(stripDemoPrefix('/demo?a=1')).toBe('/?a=1');
        expect(stripDemoPrefix('/demonstration')).toBe('/demonstration');
        expect(stripDemoPrefix('/app')).toBe('/app');
    });
});

describe('crossHref (mode all)', () => {
    it('garde les chemins relatifs et le préfixe /demo', () => {
        expect(crossHref('demo', '/demo/planning/impots')).toBe('/demo/planning/impots');
        expect(crossHref('app', '/auth?tab=register')).toBe('/auth?tab=register');
    });
});
