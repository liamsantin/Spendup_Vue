import { describe, expect, it } from 'vitest';
import { buildAliasPayload, emptyAliasFormFields, type AliasFormFields } from '@/features/aliases/payload';

function fields(overrides: Partial<AliasFormFields> = {}): AliasFormFields {
    return { ...emptyAliasFormFields(), ...overrides };
}

describe('buildAliasPayload', () => {
    it('trims the value and applies defaults', () => {
        expect(buildAliasPayload(fields({ value: '  COOP-4521 ' }))).toEqual({
            ok: true,
            payload: { value: 'COOP-4521', matchType: 'exact', priority: 0, isActive: true }
        });
    });

    it('rejects an empty or too long value', () => {
        expect(buildAliasPayload(fields({ value: '   ' }))).toMatchObject({ ok: false, code: 'valueRequired' });
        expect(buildAliasPayload(fields({ value: 'a'.repeat(256) }))).toMatchObject({ ok: false, code: 'valueTooLong' });
    });

    it('requires a letter or digit outside regex', () => {
        expect(buildAliasPayload(fields({ value: '--' }))).toMatchObject({ ok: false, code: 'valueNoAlphanumeric' });
        expect(buildAliasPayload(fields({ value: 'Café' }))).toMatchObject({ ok: true });
    });

    it('validates regex syntax', () => {
        expect(buildAliasPayload(fields({ value: 'twint(', matchType: 'regex' }))).toMatchObject({ ok: false, code: 'regexInvalid' });
        expect(buildAliasPayload(fields({ value: '^twint\\s', matchType: 'regex' }))).toMatchObject({ ok: true });
    });

    it('does not reject .NET-only regex constructs (the API arbitrates)', () => {
        for (const value of ['(?i)twint', '(?>coop|migros)\\s\\d+', "(?'shop'coop)-\\d{4}", '\\p{Lu}{3}\\d+', '\\Asbb\\z', '(?<id>\\d+)']) {
            expect(buildAliasPayload(fields({ value, matchType: 'regex' }))).toMatchObject({ ok: true });
        }
        expect(buildAliasPayload(fields({ value: '(?i)twint(', matchType: 'regex' }))).toMatchObject({ ok: false, code: 'regexInvalid' });
    });

    it('checks the priority range', () => {
        expect(buildAliasPayload(fields({ value: 'x', priority: '1001' }))).toMatchObject({ ok: false, code: 'priorityInvalid' });
        expect(buildAliasPayload(fields({ value: 'x', priority: '1.5' }))).toMatchObject({ ok: false, code: 'priorityInvalid' });
        expect(buildAliasPayload(fields({ value: 'x', priority: '-1000' }))).toMatchObject({ ok: true, payload: { priority: -1000 } });
        expect(buildAliasPayload(fields({ value: 'x', priority: '' }))).toMatchObject({ ok: true, payload: { priority: 0 } });
    });
});
