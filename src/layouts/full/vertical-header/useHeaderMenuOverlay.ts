import { computed } from 'vue';
import { useDisplay } from 'vuetify';

/** Opacité du scrim header — plus léger qu’une modale Vuetify (~0.32). */
const HEADER_MENU_SCRIM_OPACITY = 0.16;

/**
 * Fond grisé léger pour les menus du header en mobile/tablette
 * (`mdAndDown`, même breakpoint que le drawer hamburger).
 */
export function useHeaderMenuOverlay() {
    const { mdAndDown } = useDisplay();

    const scrim = computed(() => mdAndDown.value);
    const opacity = computed(() => (mdAndDown.value ? HEADER_MENU_SCRIM_OPACITY : undefined));

    return { scrim, opacity };
}
