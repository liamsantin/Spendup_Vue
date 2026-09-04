import { computed, type Component } from 'vue';
import { RouterLink } from 'vue-router';
import type { NavLeaf } from '../types/navigation';

/**
 * Rend une entrée de navigation sous la bonne balise : <RouterLink> si l'entrée
 * porte un `to`, <a> si elle porte un `href`, <button> sinon. Les entrées qui ne
 * font qu'ouvrir un accordéon restent des boutons (`forceButton`).
 */
export function useLinkTag(leaf: () => NavLeaf, forceButton?: () => boolean) {
    const tag = computed<Component | string>(() => {
        if (forceButton?.()) return 'button';
        if (leaf().to) return RouterLink;
        if (leaf().href) return 'a';
        return 'button';
    });

    const attrs = computed<Record<string, unknown>>(() => {
        if (tag.value === RouterLink) return { to: leaf().to };
        if (tag.value === 'a') return { href: leaf().href };
        return { type: 'button' };
    });

    return { tag, attrs };
}
