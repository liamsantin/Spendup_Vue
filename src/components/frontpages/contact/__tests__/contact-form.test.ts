import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock('@/features/auth/api', () => ({ authHttp: { post: postMock } }));

import { buildContactMailto, CONTACT_MESSAGE_MAX, sendContactMessage, validateContactForm, type ContactFormValues } from '../contact-form';

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

describe('sendContactMessage', () => {
    beforeEach(() => postMock.mockReset().mockResolvedValue(undefined));

    it('poste le message nettoyé vers /api/contact, champ piège vide par défaut', async () => {
        await sendContactMessage({ ...valid, name: '  Léa Rochat ', message: ' Bonjour à vous ' });
        expect(postMock).toHaveBeenCalledWith('/api/contact', {
            name: 'Léa Rochat',
            email: 'lea@example.ch',
            subject: 'support',
            message: 'Bonjour à vous',
            consent: true,
            website: ''
        });
    });

    it('transmet le champ piège tel quel', async () => {
        await sendContactMessage(valid, 'http://spam.example');
        expect(postMock.mock.calls[0][1].website).toBe('http://spam.example');
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
