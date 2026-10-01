import { describe, expect, it } from 'vitest';
import { buildContactMailto, CONTACT_MESSAGE_MAX, validateContactForm, type ContactFormValues } from '../contact-form';

const valid: ContactFormValues = {
    name: 'Léa Rochat',
    email: 'lea@example.ch',
    subject: 'support',
    message: 'Comment importer un relevé PDF ?',
    consent: true
};

describe('validateContactForm', () => {
    it('accepte un formulaire complet', () => {
        expect(validateContactForm(valid)).toEqual({});
    });

    it('signale chaque champ manquant ou invalide', () => {
        const errors = validateContactForm({ name: ' ', email: 'lea@', subject: 'question', message: 'court', consent: false });
        expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'message', 'name']);
    });

    it('refuse un message trop long', () => {
        expect(validateContactForm({ ...valid, message: 'x'.repeat(CONTACT_MESSAGE_MAX + 1) }).message).toBeTruthy();
    });
});

describe('buildContactMailto', () => {
    it('encode l’objet et le corps', () => {
        const href = buildContactMailto('contact@example.ch', valid);
        expect(href.startsWith('mailto:contact@example.ch?subject=')).toBe(true);
        const params = new URLSearchParams(href.split('?')[1]);
        expect(params.get('subject')).toBe('[Spend.Up] Aide à l’utilisation — Léa Rochat');
        expect(params.get('body')).toContain('Comment importer un relevé PDF ?');
        expect(params.get('body')).toContain('Léa Rochat <lea@example.ch>');
    });
});
