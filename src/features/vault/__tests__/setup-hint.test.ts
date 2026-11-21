import { describe, expect, it } from 'vitest';
import { shouldShowSetupHint, type SetupHintInput } from '@/features/vault/setup-hint';

/** Compte Google seul, sans Coffre, jamais proposé : le cas où le bandeau doit s’afficher. */
const googleOnly: SetupHintInput = {
    bootstrapped: true,
    dismissed: false,
    demo: false,
    hasPassword: false,
    statusLoaded: true,
    vaultExists: false,
    alreadyShown: false
};

describe('shouldShowSetupHint', () => {
    it('propose une phrase à un compte Google seul sans Coffre', () => {
        expect(shouldShowSetupHint(googleOnly)).toBe(true);
    });

    it('ne propose rien en démo : l’utilisateur fictif n’a pas de mot de passe mais n’est pas un compte Google', () => {
        expect(shouldShowSetupHint({ ...googleOnly, demo: true })).toBe(false);
    });

    it('ne propose rien à un compte qui a un mot de passe, ni quand c’est inconnu', () => {
        expect(shouldShowSetupHint({ ...googleOnly, hasPassword: true })).toBe(false);
        expect(shouldShowSetupHint({ ...googleOnly, hasPassword: null })).toBe(false);
        expect(shouldShowSetupHint({ ...googleOnly, hasPassword: undefined })).toBe(false);
    });

    it('ne propose rien tant que l’état du Coffre n’est pas lu, ni quand un Coffre existe', () => {
        expect(shouldShowSetupHint({ ...googleOnly, bootstrapped: false })).toBe(false);
        expect(shouldShowSetupHint({ ...googleOnly, statusLoaded: false })).toBe(false);
        expect(shouldShowSetupHint({ ...googleOnly, vaultExists: true })).toBe(false);
    });

    it('ne revient pas une fois fermée ni une fois montrée sur cet appareil', () => {
        expect(shouldShowSetupHint({ ...googleOnly, dismissed: true })).toBe(false);
        expect(shouldShowSetupHint({ ...googleOnly, alreadyShown: true })).toBe(false);
    });
});
