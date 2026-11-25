import { ref } from 'vue';
import { APP_TARGET } from '@/utils/helpers/app-target';

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
    // demo.spendup.ch : URLs sans préfixe (`/finances/comptes`) → `/app/finances/comptes`.
    if (
        APP_TARGET === 'demo' &&
        trimmed !== '/app' &&
        !trimmed.startsWith('/app/') &&
        !trimmed.startsWith('/app?') &&
        !trimmed.startsWith('/app#')
    ) {
        return `/app${trimmed === '/' ? '' : trimmed}`;
    }
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

/** Préfixe des URLs de démo : vide sur demo.spendup.ch, `/demo` ailleurs (dev, tests). */
export const DEMO_PREFIX = APP_TARGET === 'demo' ? '' : '/demo';

/** Accueil de la démo (`/` sur demo.spendup.ch, `/demo` ailleurs). */
export const DEMO_HOME = DEMO_PREFIX || '/';

/** `/app/x` → URL de démo correspondante. */
export function appToDemoPath(appPath: string): string {
    return `${DEMO_PREFIX}${appPath.slice('/app'.length)}` || '/';
}

/** La route cible appartient-elle à la démo ? Toujours vrai sur demo.spendup.ch. */
export function isDemoPath(path: string): boolean {
    if (APP_TARGET === 'demo') return true;
    return path === '/demo' || path.startsWith('/demo/');
}
