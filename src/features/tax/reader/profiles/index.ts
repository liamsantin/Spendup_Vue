import { matchesProfile } from '../engine';
import type { FormProfile } from '../types';
import { FR_2025 } from './fr-2025';
import { JU_2025 } from './ju-2025';

/** Formulaires connus. Ajouter un canton ou une année = ajouter un profil ici, sans toucher au moteur. */
export const FORM_PROFILES: FormProfile[] = [JU_2025, FR_2025];

/** Profil dont les signatures figurent toutes dans le texte du document, ou `null` (format inconnu). */
export function findProfile(text: string): FormProfile | null {
    return FORM_PROFILES.find((profile) => matchesProfile(text, profile)) ?? null;
}
