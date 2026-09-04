import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

/** Icônes fournies par BaseIcon. Le type ferme la porte aux fautes de frappe. */
export type IconName =
    | 'bell'
    | 'building'
    | 'burger'
    | 'chevron-left'
    | 'chevron-right'
    | 'close'
    | 'contacts'
    | 'credit-card'
    | 'dots'
    | 'explore'
    | 'finance'
    | 'folder'
    | 'folder-code'
    | 'home'
    | 'integrations'
    | 'lock'
    | 'messages'
    | 'minus'
    | 'pin'
    | 'plus'
    | 'search'
    | 'settings'
    | 'sliders'
    | 'sparkle'
    | 'threads'
    | 'user';

/** Pictogramme d’une entrée : nom du jeu BaseIcon, ou composant (rail / tabler). */
export type NavIcon = IconName | Component;

/** Entrée terminale : un sous-onglet ou une ligne de la colonne de détail. */
export interface NavLeaf {
    id: string;
    label: string;
    icon: NavIcon;
    /** Rend la ligne comme <RouterLink> vers cette destination. */
    to?: RouteLocationRaw;
    /** Rend la ligne comme <a href>. Ignoré si `to` est fourni. */
    href?: string;
}

/** Bloc de la colonne de détail, avec son intitulé et son action facultative. */
export interface NavGroup {
    id: string;
    title?: string;
    action?: IconName;
    items: NavLeaf[];
}

/** Onglet principal de la colonne. */
export interface NavItem extends NavLeaf {
    /** Compteur affiché à droite du libellé. Prioritaire sur `action`. */
    badge?: number;
    /** Pastille d'alerte posée sur l'icône. */
    dot?: boolean;
    /** Icône d'action affichée à droite quand l'entrée n'a ni badge ni enfants. */
    action?: IconName;
    /** Sous-onglets dépliés en accordéon sous l'entrée. */
    children?: NavLeaf[];
    /** Contenu de la colonne de droite quand l'entrée est ouverte. */
    detail?: NavGroup[];
}
