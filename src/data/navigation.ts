import type { NavItem } from '../types/navigation'

/*
 * Données d'exemple du template. Dans un projet, remplacez ce fichier par vos
 * propres entrées (ou construisez-les ailleurs) et passez-les en props :
 *   <AppShell :items="mesOnglets" :bottom-items="mesOngletsBas" />
 * Chaque entrée accepte `to` (RouterLink) ou `href` (<a>) pour devenir un lien.
 */

/** Onglets du haut de la colonne. */
export const primaryNav: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    detail: [
      {
        id: 'home-pinned',
        title: 'Pinned (2)',
        action: 'pin',
        items: [
          { id: 'home-today', label: 'Today', icon: 'folder' },
          { id: 'home-activity', label: 'Activity', icon: 'folder' },
        ],
      },
      {
        id: 'home-spaces',
        title: 'Spaces (3)',
        action: 'folder',
        items: [
          { id: 'home-design', label: 'Design', icon: 'folder-code' },
          { id: 'home-product', label: 'Product', icon: 'folder-code' },
          { id: 'home-research', label: 'Research', icon: 'folder-code' },
        ],
      },
    ],
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: 'messages',
    badge: 2,
    dot: true,
    children: [
      { id: 'messages-inbox', label: 'Inbox', icon: 'folder-code' },
      { id: 'messages-mentions', label: 'Mentions', icon: 'folder-code' },
      { id: 'messages-archive', label: 'Archived', icon: 'folder-code' },
    ],
    detail: [
      {
        id: 'messages-quick',
        items: [
          { id: 'messages-unread', label: 'Unread', icon: 'folder' },
          { id: 'messages-starred', label: "Starred's", icon: 'folder-code' },
        ],
      },
      {
        id: 'messages-teams',
        title: 'Teams (2)',
        action: 'folder',
        items: [
          { id: 'messages-design-team', label: 'Design', icon: 'folder-code' },
          { id: 'messages-support', label: 'Support', icon: 'folder-code' },
        ],
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'integrations',
    action: 'plus',
    children: [
      { id: 'integrations-figma', label: 'Figma', icon: 'folder-code' },
      { id: 'integrations-slack', label: 'Slack', icon: 'folder-code' },
    ],
    detail: [
      {
        id: 'integrations-installed',
        title: 'Installed (4)',
        action: 'folder',
        items: [
          { id: 'integrations-github', label: 'GitHub', icon: 'folder-code' },
          { id: 'integrations-linear', label: 'Linear', icon: 'folder-code' },
          { id: 'integrations-notion', label: 'Notion', icon: 'folder-code' },
          { id: 'integrations-vercel', label: 'Vercel', icon: 'folder-code' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'finance',
    detail: [
      {
        id: 'finance-quick',
        items: [
          { id: 'finance-invoices', label: 'Invoices', icon: 'folder' },
          { id: 'finance-payouts', label: 'Payouts', icon: 'folder' },
        ],
      },
      {
        id: 'finance-reports',
        title: 'Reports (3)',
        action: 'pin',
        items: [
          { id: 'finance-q1', label: 'Q1 2026', icon: 'folder-code' },
          { id: 'finance-q2', label: 'Q2 2026', icon: 'folder-code' },
          { id: 'finance-taxes', label: 'Taxes', icon: 'folder-code' },
        ],
      },
    ],
  },
  {
    id: 'threads',
    label: 'Threads',
    icon: 'threads',
    children: [
      { id: 'threads-fignuts', label: 'Fignuts', icon: 'folder-code' },
      { id: 'threads-enlarz', label: 'Enlarz System', icon: 'folder-code' },
      { id: 'threads-hugeicons', label: 'Hugeicons', icon: 'folder-code' },
    ],
    detail: [
      {
        id: 'threads-quick',
        items: [
          { id: 'threads-archive', label: 'Archive', icon: 'folder' },
          { id: 'threads-favourites', label: "Favourite's", icon: 'folder-code' },
        ],
      },
      {
        id: 'threads-drafts',
        title: 'Drafts (3)',
        action: 'pin',
        items: [
          { id: 'threads-general', label: 'General', icon: 'folder-code' },
          { id: 'threads-drafts', label: 'Drafts', icon: 'folder-code' },
          { id: 'threads-feedback', label: 'Feedback', icon: 'folder-code' },
        ],
      },
      {
        id: 'threads-folders',
        title: 'Folders (6)',
        action: 'folder',
        items: [
          { id: 'threads-stroke', label: 'Stroke LLC', icon: 'folder-code' },
          { id: 'threads-duotone', label: 'Duotone', icon: 'folder-code' },
          { id: 'threads-solid', label: 'Solid', icon: 'folder-code' },
          { id: 'threads-animations', label: 'Animations', icon: 'folder-code' },
        ],
      },
    ],
  },
]

/** Onglets épinglés en bas de la colonne. */
export const secondaryNav: NavItem[] = [
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'contacts',
    detail: [
      {
        id: 'contacts-lists',
        title: 'Lists (2)',
        action: 'folder',
        items: [
          { id: 'contacts-clients', label: 'Clients', icon: 'folder-code' },
          { id: 'contacts-team', label: 'Team', icon: 'folder-code' },
        ],
      },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: 'explore',
    action: 'plus',
    children: [
      { id: 'explore-trending', label: 'Trending', icon: 'folder-code' },
      { id: 'explore-new', label: 'New releases', icon: 'folder-code' },
    ],
    detail: [
      {
        id: 'explore-collections',
        title: 'Collections (3)',
        action: 'pin',
        items: [
          { id: 'explore-icons', label: 'Icon packs', icon: 'folder-code' },
          { id: 'explore-illus', label: 'Illustrations', icon: 'folder-code' },
          { id: 'explore-motion', label: 'Motion', icon: 'folder-code' },
        ],
      },
    ],
  },
]
