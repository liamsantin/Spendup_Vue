import type { AppTarget } from '@/utils/helpers/app-target';

declare module 'vue' {
    interface ComponentCustomProperties {
        /** Lien vers une autre cible web (landing / demo / app). Voir `utils/helpers/app-target`. */
        $crossHref: (target: AppTarget, path: string) => string;
    }
}
