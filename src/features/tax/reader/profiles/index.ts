import type { FormProfile } from '../types';
import { JU_2025 } from './ju-2025';

/** Formulaires connus. Ajouter un canton ou une année = ajouter un profil ici, sans toucher au moteur. */
export const FORM_PROFILES: FormProfile[] = [JU_2025];

/** Profil dont la signature figure dans le texte du document, ou `null` (format inconnu). */
export function findProfile(text: string): FormProfile | null {
    return FORM_PROFILES.find((profile) => profile.detect.test(text)) ?? null;
}
