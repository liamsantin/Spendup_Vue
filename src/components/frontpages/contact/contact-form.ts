/**
 * Formulaire de contact des landing pages.
 *
 * Pas d'endpoint de contact côté API : l'envoi ouvre la messagerie de l'utilisateur avec
 * un message pré-rédigé (`mailto:`). L'adresse de destination vient de `VITE_CONTACT_EMAIL`.
 */

export const CONTACT_NAME_MAX = 100;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 2000;

export const CONTACT_SUBJECTS = [
    { value: 'question', label: 'Question générale' },
    { value: 'support', label: 'Aide à l’utilisation' },
    { value: 'data', label: 'Mes données personnelles' },
    { value: 'partner', label: 'Presse & partenariats' }
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]['value'];

export interface ContactFormValues {
    name: string;
    email: string;
    subject: ContactSubject;
    message: string;
    consent: boolean;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Adresse de destination configurée, ou `null` si la variable n'est pas renseignée. */
export function contactEmail(): string | null {
    const raw = String(import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
    return EMAIL_RE.test(raw) ? raw : null;
}

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
    const errors: ContactFormErrors = {};
    const name = values.name.trim();
    const message = values.message.trim();
    if (!name) errors.name = 'Indiquez votre nom.';
    else if (name.length > CONTACT_NAME_MAX) errors.name = `${CONTACT_NAME_MAX} caractères au maximum.`;
    if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Indiquez une adresse e-mail valide.';
    if (message.length < CONTACT_MESSAGE_MIN) errors.message = `Votre message doit compter au moins ${CONTACT_MESSAGE_MIN} caractères.`;
    else if (message.length > CONTACT_MESSAGE_MAX) errors.message = `${CONTACT_MESSAGE_MAX} caractères au maximum.`;
    if (!values.consent) errors.consent = 'Votre accord est nécessaire pour que nous puissions vous répondre.';
    return errors;
}

/** Lien `mailto:` pré-rempli (objet + corps encodés). */
export function buildContactMailto(to: string, values: ContactFormValues): string {
    const subjectLabel = CONTACT_SUBJECTS.find((item) => item.value === values.subject)?.label ?? 'Contact';
    const subject = `[Spendup] ${subjectLabel} — ${values.name.trim()}`;
    const body = [values.message.trim(), '', '—', `${values.name.trim()} <${values.email.trim()}>`].join('\n');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
