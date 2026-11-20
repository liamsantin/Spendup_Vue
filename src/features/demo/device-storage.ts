import { isDemoSession } from '@/features/demo/session';

/** Mémoire de la démo : remplace le `localStorage` tant que la session démo est active. */
const demoMemory = new Map<string, string>();

function local(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

/**
 * Stockage « sur cet appareil » des préférences de travail (étapes validées, montants lus d'un PDF…).
 * En démo, tout reste en mémoire : rien n'est écrit dans le `localStorage` du poste, et « Réinitialiser la démo »
 * ou la sortie de démo l'efface (`clearDemoDeviceStorage`). Hors démo, c'est le `localStorage` habituel.
 */
export const deviceStorage = {
    getItem(key: string): string | null {
        if (isDemoSession()) return demoMemory.get(key) ?? null;
        return local()?.getItem(key) ?? null;
    },
    setItem(key: string, value: string): void {
        if (isDemoSession()) {
            demoMemory.set(key, value);
            return;
        }
        local()?.setItem(key, value);
    },
    removeItem(key: string): void {
        if (isDemoSession()) {
            demoMemory.delete(key);
            return;
        }
        local()?.removeItem(key);
    }
};

/** Oublie tout ce que la démo a mémorisé (réinitialisation ou sortie de démo). */
export function clearDemoDeviceStorage(): void {
    demoMemory.clear();
}
