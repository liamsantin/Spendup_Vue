import { onBeforeUnmount, watch, type Ref } from 'vue';

/*
 * Verrou de défilement à compteur partagé.
 *
 * Écrire directement `document.body.style.overflow = ''` en refermant un volet
 * déverrouille la page même si une autre modale est encore ouverte, et perd la
 * valeur d'origine. Le compteur ci-dessous ne restaure l'état initial qu'au tout
 * dernier relâchement.
 */
let holders = 0;
let previousOverflow = '';

function acquire() {
    if (holders === 0) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    holders += 1;
}

function release() {
    if (holders === 0) return;
    holders -= 1;
    if (holders === 0) {
        document.body.style.overflow = previousOverflow;
    }
}

/** Verrouille le défilement du document tant que `active` est vrai. */
export function useScrollLock(active: Ref<boolean> | (() => boolean)) {
    let held = false;

    function apply(shouldLock: boolean) {
        if (shouldLock === held) return;
        held = shouldLock;
        if (shouldLock) acquire();
        else release();
    }

    watch(active, apply);
    onBeforeUnmount(() => apply(false));
}
