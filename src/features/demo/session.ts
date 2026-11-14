import { ref } from 'vue';

const STORAGE_KEY = 'spendup.demo';

function readFlag(): boolean {
    try {
        return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

/** Session démo active (mémoire + `sessionStorage`, pour survivre au rechargement). */
export const demoActive = ref(readFlag());

export function isDemoSession(): boolean {
    return demoActive.value;
}

export function markDemoSession(): void {
    demoActive.value = true;
    try {
        sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
        /* navigation privée : la démo vit le temps de l’onglet */
    }
}

/**
 * Les fiches lisent des chemins `/app/...`. En démo l’URL est `/demo/...` :
 * on la ramène au chemin applicatif avant d’en extraire l’identifiant.
 */
export function asAppPath(path: string): string {
    const trimmed = path.trim();
    if (trimmed === '/demo' || trimmed.startsWith('/demo/') || trimmed.startsWith('/demo?') || trimmed.startsWith('/demo#')) {
        return `/app${trimmed.slice('/demo'.length)}`;
    }
    return trimmed;
}

export function clearDemoSession(): void {
    demoActive.value = false;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* déjà inaccessible */
    }
}
