import { nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/** Paramètre d'URL qui ouvre le formulaire de création d'une page (ajout rapide mobile). */
export const CREATE_QUERY_KEY = 'create';

/**
 * Ouvre le formulaire de création quand l'URL porte `?create=1`, puis retire le
 * paramètre (un retour arrière ne rouvre pas le formulaire).
 *
 * `ready` retarde l'ouverture tant que la page ne l'autorise pas (comptes pas
 * encore chargés, action en cours…) : le paramètre reste alors en attente.
 */
export function useCreateFromQuery(open: () => void, ready: () => boolean = () => true) {
    const route = useRoute();
    const router = useRouter();

    watch(
        () => [route.query[CREATE_QUERY_KEY], ready()] as const,
        async ([flag, allowed]) => {
            if (flag !== '1' || !allowed) return;
            await nextTick();
            open();
            const next = { ...route.query };
            delete next[CREATE_QUERY_KEY];
            void router.replace({ path: route.path, query: next });
        },
        { immediate: true }
    );
}
