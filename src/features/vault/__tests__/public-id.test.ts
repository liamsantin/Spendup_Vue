import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/utils/errors/app-error';
import { generatePublicId, isConflictError, isValidPublicId, withFreshPublicId } from '@/features/vault/public-id';

describe('publicId choisi par le client', () => {
    it('tire un GUID 8-4-4-4-12 en minuscules, différent à chaque tirage', () => {
        const a = generatePublicId();
        const b = generatePublicId();
        expect(isValidPublicId(a)).toBe(true);
        expect(isValidPublicId(b)).toBe(true);
        expect(a).not.toBe(b);
        expect(a).toBe(a.toLowerCase());
        expect(isValidPublicId('0F8FAD5B-D9CB-469F-A165-70867728950E')).toBe(false);
        expect(isValidPublicId('abc')).toBe(false);
    });

    it('withFreshPublicId retente avec un nouvel identifiant sur 409 CONFLICT, propage les autres erreurs', async () => {
        const seen: string[] = [];
        const create = vi.fn(async (publicId: string) => {
            seen.push(publicId);
            if (seen.length === 1) throw new AppError('Identifiant déjà pris.', 409, 'CONFLICT');
            return { publicId };
        });
        const result = await withFreshPublicId(create);
        expect(create).toHaveBeenCalledTimes(2);
        expect(seen[0]).not.toBe(seen[1]);
        expect(result.publicId).toBe(seen[1]);

        const failing = vi.fn(async () => {
            throw new AppError('Données invalides.', 400);
        });
        await expect(withFreshPublicId(failing)).rejects.toMatchObject({ status: 400 });
        expect(failing).toHaveBeenCalledTimes(1);

        const always = vi.fn(async () => {
            throw new AppError('Conflit', 409, 'CONFLICT');
        });
        await expect(withFreshPublicId(always)).rejects.toMatchObject({ status: 409 });
        expect(always).toHaveBeenCalledTimes(4);
        expect(isConflictError(new AppError('x', 409))).toBe(true);
        expect(isConflictError(new Error('x'))).toBe(false);
    });
});
