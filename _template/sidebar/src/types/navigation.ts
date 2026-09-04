import type { RouteLocationRaw } from 'vue-router'

/** Icônes fournies par BaseIcon. Le type ferme la porte aux fautes de frappe. */
export type IconName =
  | 'bell'
  | 'burger'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'contacts'
  | 'dots'
  | 'explore'
  | 'finance'
  | 'folder'
  | 'folder-code'
  | 'home'
  | 'integrations'
  | 'messages'
  | 'minus'
  | 'pin'
  | 'plus'
  | 'search'
  | 'sparkle'
  | 'threads'
  | 'user'

/** Entrée terminale : un sous-onglet ou une ligne de la colonne de détail. */
export interface NavLeaf {
  id: string
  label: string
  icon: IconName
  /** Rend la ligne comme <RouterLink> vers cette destination. */
  to?: RouteLocationRaw
  /** Rend la ligne comme <a href>. Ignoré si `to` est fourni. */
  href?: string
}

/** Bloc de la colonne de détail, avec son intitulé et son action facultative. */
export interface NavGroup {
  id: string
  title?: string
  action?: IconName
  items: NavLeaf[]
}

/** Onglet principal de la colonne. */
export interface NavItem extends NavLeaf {
  /** Compteur affiché à droite du libellé. Prioritaire sur `action`. */
  badge?: number
  /** Pastille d'alerte posée sur l'icône. */
  dot?: boolean
  /** Icône d'action affichée à droite quand l'entrée n'a ni badge ni enfants. */
  action?: IconName
  /** Sous-onglets dépliés en accordéon sous l'entrée. */
  children?: NavLeaf[]
  /** Contenu de la colonne de droite quand l'entrée est ouverte. */
  detail?: NavGroup[]
}
