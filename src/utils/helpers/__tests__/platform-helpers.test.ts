import { describe, expect, it } from 'vitest';
import { isTauri } from '../platform-helpers';

describe('platform-helpers', () => {
    it('isTauri is false in jsdom / web tests', () => {
        expect(isTauri()).toBe(false);
    });
});
