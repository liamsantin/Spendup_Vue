import { describe, expect, it } from 'vitest';
import { buildCreateTagPayload, buildUpdateTagPayload, isTagFormDirty, type TagFormFields } from '@/features/tags/payload';
import type { Tag } from '@/features/tags/types';

function fields(partial: Partial<TagFormFields> = {}): TagFormFields {
    return {
        name: 'Urgent',
        color: '#EF4444',
        ...partial
    };
}

function tag(partial: Partial<Tag> = {}): Tag {
    return {
        publicId: 't-1',
        name: 'Urgent',
        color: '#ef4444',
        transactionCount: 0,
        recurringExpenseCount: 0,
        createdAt: '2026-09-23T19:00:00Z',
        updatedAt: null,
        ...partial
    };
}

describe('tag payload', () => {
    it('trim le nom et omet color vide à la création', () => {
        const created = buildCreateTagPayload(fields({ name: '  Urgent  ', color: '#EF4444' }));
        expect(created.ok).toBe(true);
        if (created.ok) {
            expect(created.payload).toEqual({ name: 'Urgent', color: '#ef4444' });
        }

        const noColor = buildCreateTagPayload(fields({ color: null }));
        expect(noColor.ok).toBe(true);
        if (noColor.ok) {
            expect(noColor.payload).toEqual({ name: 'Urgent' });
            expect(noColor.payload).not.toHaveProperty('color');
        }
    });

    it('PUT envoie color y compris null', () => {
        const result = buildUpdateTagPayload(fields({ name: 'Prioritaire', color: null }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toEqual({ name: 'Prioritaire', color: null });
        }
    });

    it('refuse nom vide, trop long, doublon et couleur invalide', () => {
        expect(buildCreateTagPayload(fields({ name: '   ' }))).toMatchObject({ ok: false, code: 'nameRequired' });
        expect(buildCreateTagPayload(fields({ name: 'x'.repeat(101) }))).toMatchObject({ ok: false, code: 'nameTooLong' });
        expect(buildCreateTagPayload(fields({ name: 'urgent' }), [tag()])).toMatchObject({ ok: false, code: 'nameDuplicate' });
        expect(buildCreateTagPayload(fields({ color: 'red' }))).toMatchObject({ ok: false, code: 'colorInvalid' });
        expect(buildCreateTagPayload(fields({ color: '#ffff' }))).toMatchObject({ ok: false, code: 'colorInvalid' });
    });

    it('détecte le dirty d’édition', () => {
        expect(isTagFormDirty(tag(), fields({ color: '#ef4444' }))).toBe(false);
        expect(isTagFormDirty(tag(), fields({ name: 'Prioritaire' }))).toBe(true);
        expect(isTagFormDirty(tag(), fields({ color: null }))).toBe(true);
    });
});
