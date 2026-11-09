import { describe, expect, it } from 'vitest';
import {
    RECOVERY_ALPHABET,
    RECOVERY_CODE_LENGTH,
    formatRecoveryCode,
    generateRecoveryCode,
    isValidRecoveryCode,
    normalizeRecoveryCode
} from '@/features/vault/recovery-code';
import { resolveSensitiveFieldDisplay } from '@/features/vault/display';

describe('code de récupération', () => {
    it('32 caractères de l’alphabet sans ambiguïté, différents à chaque tirage', () => {
        const a = generateRecoveryCode();
        const b = generateRecoveryCode();
        expect(a).toHaveLength(RECOVERY_CODE_LENGTH);
        expect([...a].every((ch) => RECOVERY_ALPHABET.includes(ch))).toBe(true);
        expect(a).not.toBe(b);
        expect(RECOVERY_ALPHABET).not.toMatch(/[01OIL]/);
    });

    it('format en 8 groupes de 4, normalisation tolérante', () => {
        const code = generateRecoveryCode();
        const formatted = formatRecoveryCode(code);
        expect(formatted.split('-')).toHaveLength(8);
        expect(formatted.replace(/-/g, '')).toBe(code);
        expect(normalizeRecoveryCode(formatted.toLowerCase().replace(/-/g, ' '))).toBe(code);
        expect(isValidRecoveryCode(formatted)).toBe(true);
        expect(isValidRecoveryCode(formatted.slice(0, -1))).toBe(false);
        expect(isValidRecoveryCode(`${code.slice(0, -1)}0`)).toBe(false);
    });
});

describe('resolveSensitiveFieldDisplay', () => {
    it('clair, vide, illisible, étranger', () => {
        expect(resolveSensitiveFieldDisplay('CH93')).toEqual({ kind: 'plain', value: 'CH93' });
        expect(resolveSensitiveFieldDisplay('')).toEqual({ kind: 'empty' });
        expect(resolveSensitiveFieldDisplay(null)).toEqual({ kind: 'empty' });
        expect(resolveSensitiveFieldDisplay('enc:v1:abc')).toEqual({ kind: 'unreadable' });
        expect(resolveSensitiveFieldDisplay('enc:v1:abc', false)).toEqual({ kind: 'foreign' });
    });
});
