# Layout — sidebar + header

Documentation technique du template : vocabulaire, structure, API des composants et
points de vigilance pour l'intégrer dans un autre projet.

---

## 1. Vocabulaire

Trois blocs, plus deux éléments annexes. Ce sont les termes utilisés partout dans le
code et dans cette doc.

```
┌─ .sidebar ────────────────────────────────────────────────┐
│  ┌─ .surface (un seul verre pour ① et ③) ───────────────┐  │
│  │ ┌─ nav.rail ───────────┬─ .panel ─────────────────┐  │  │
│  │ │ ☰  Menu              │  Archive                 │  │  │
│  │ │ ─────────────────    │  Favourite's             │  │  │
│  │ │ ⌂  Home              │  Drafts (3)          ⚲   │  │  │
│  │ │ ▣  Messages      ②   │    General               │◀─┼──┤ .handle
│  │ │ ⊞  Integrations  +   │    Drafts                │  │  │
│  │ │ ▤  Threads       −   │  Folders (6)         ⌷   │  │  │
│  │ │  │ ⌗ Fignuts         │    Stroke LLC            │  │  │
│  │ │  │ ⌗ Enlarz System   │    Duotone               │  │  │
│  │ │ ─────────────────    │                          │  │  │
│  │ │ ▢  Contacts          │                          │  │  │
│  │ └──┴───────────────────┴──────────────────────────┘  │  │
│  └──── 76 → 288 px ───────┴──── 0 → 248 px ───────────┘  │
└───────────────────────────────────────────────────────────┘
```

### ① Le rail — état replié

`nav.rail` dans son état étroit (`--rail-w`, 76 px). Ce n'est pas un composant à
part : **c'est la même colonne que ②**, simplement moins large.

- État : `.sidebar` **sans** `.is-expanded`
- Contenu : le `BurgerButton`, puis une **ligne** par onglet (`.item`) réduite à son
  **emplacement d'icône** (`.item__icon`, `--slot` = 44 px)
- Les sous-onglets de l'onglet ouvert y apparaissent comme des **points sur le fil**
  (`.sub__row::before` sur le filet `.sub__list::before`)

### ② La colonne — état déployé

Le même `nav.rail`, élargi à `--rail-open-w` (288 px).

- État : `.sidebar.is-expanded`
- Ce qui apparaît : l'**en-tête** (`.head` = burger + `.head__title`), le **filet**
  (`.rule`), puis sur chaque ligne le **libellé** (`.item__label`), le **badge**
  (`.badge`) ou le **chevron** (`.item__chev`)
- Une ligne = un `NavRow`, alimenté par un `NavItem` — un **onglet principal**
- Un second filet (`.rule--bottom`) sépare le groupe épinglé en bas

### ③ La colonne de détail

`.panel`, large de `--detail-w` (248 px). Toujours montée, elle passe de 0 à 248 px
quand l'onglet ouvert possède un `detail`.

- État : `.is-expanded .panel.has-detail`
- Contenu : des **groupes** (`section.group`, un par `NavGroup`) avec leur
  **intitulé** (`.group__head`) et leurs **entrées** (`NavLeaf` en variante
  `.leaf--wide`)

### Deux choses s'ouvrent au clic sur un onglet

| Terme | Élément | Donnée | Où ça s'affiche |
| --- | --- | --- | --- |
| **l'accordéon** | `.sub` dans la ligne | `NavItem.children` | sous la ligne, dans la colonne |
| **la colonne de détail** | `.panel` | `NavItem.detail` | à droite (bloc ③) |

Cliquer sur un onglet ouvre les deux simultanément.

### Éléments annexes

- **la poignée** (`.handle`) : le chevron accroché au bord extérieur de la surface,
  qui suit l'expansion. Masquée sur mobile.
- **le voile** (`.scrim`) : le fond sombre du volet mobile. Absent sur desktop.

---

## 2. Arbre DOM

```
.sidebar                       ← racine, porte .is-expanded
├── .surface                   ← la surface de verre (fond, bordure, ombre, flou)
│   └── .slider                ← rangée des deux panneaux (glisse sur mobile)
│       ├── nav.rail           ← blocs ① et ②
│       │   ├── header.head    ← BurgerButton + .head__title (+ .head__close mobile)
│       │   ├── .rule
│       │   └── .rail__scroll
│       │       ├── ul.nav              → NavRow…
│       │       │   └── li.nav__row
│       │       │       ├── .item       ← ligne : .item__icon, .item__label, .badge/.item__chev
│       │       │       └── .sub        ← accordéon
│       │       │           └── ul.sub__list › li.sub__row › NavLeaf.leaf
│       │       ├── .rule--bottom
│       │       └── ul.nav.nav--bottom  → NavRow…
│       └── .panel             ← bloc ③
│           └── .panel__inner
│               ├── header.back        ← retour, mobile uniquement
│               └── .panel__scroll     ← TransitionGroup
│                   └── section.group › .group__head + NavLeaf.leaf--wide
├── button.handle
└── .scrim
```

---

## 3. Fichiers

| Fichier | Rôle |
| --- | --- |
| `components/AppShell.vue` | coquille : sidebar + header + contenu, état partagé |
| `components/AppSidebar.vue` | surface, colonne (① ②), colonne de détail (③), overlay mobile |
| `components/AppHeader.vue` | barre du haut : burger mobile, recherche, notifications, compte |
| `components/NavRow.vue` | une ligne d'onglet + son accordéon |
| `components/NavLeaf.vue` | une entrée terminale (sous-onglet ou ligne de détail) |
| `components/BurgerButton.vue` | bouton de bascule, morphing burger → croix |
| `components/BaseIcon.vue` | jeu d'icônes SVG, typé par `IconName` |
| `types/navigation.ts` | `IconName`, `NavLeaf`, `NavGroup`, `NavItem` |
| `composables/useBreakpoint.ts` | `MOBILE_BREAKPOINT`, `useIsMobile()` |
| `composables/useScrollLock.ts` | verrou de scroll à compteur partagé |
| `composables/useLinkTag.ts` | `RouterLink` / `<a>` / `<button>` selon l'entrée |
| `assets/tokens.css` | tous les jetons de design |
| `assets/base.css` | reset minimal + `prefers-reduced-motion` global |
| `data/navigation.ts` | données d'exemple, à remplacer |

---

## 4. API des composants

### AppShell

Point d'entrée recommandé : il porte l'état d'ouverture, les colonnes, le décor de
fond et l'adaptation mobile.

```vue
<AppShell
  v-model:open="open"            <!-- sidebar déployée (booléen) -->
  v-model:open-id="openId"       <!-- id de l'onglet ouvert, ou null -->
  v-model:active-id="activeId"   <!-- id de l'entrée sélectionnée, ou null -->
  v-model:search="query"         <!-- requête du champ de recherche -->
  :items="primaryNav"            <!-- NavItem[] du haut -->
  :bottom-items="secondaryNav"   <!-- NavItem[] épinglés en bas -->
  :notifications="3"             <!-- 0 masque la pastille -->
  title="Menu"
  @select="onSelect"             <!-- (leaf: NavLeaf) -->
  @search-submit="onSearch"      <!-- (value: string) sur Entrée -->
>
  <RouterView />
</AppShell>
```

Slots : `header` (reçoit `open` et `toggle`) pour remplacer la barre du haut,
`default` pour le contenu.

Tous les modèles sont facultatifs : sans eux le composant gère son état en interne.

### AppSidebar

Mêmes `items` / `bottom-items` / `title`, mêmes modèles `open` / `open-id` /
`active-id`, même événement `select`. À utiliser directement si la coquille ne
convient pas à la mise en page du projet.

### AppHeader

| Entrée | Type | Défaut |
| --- | --- | --- |
| `menuOpen` | `boolean` | `false` |
| `notifications` | `number` | `0` |
| `searchPlaceholder` | `string` | `'Rechercher…'` |
| `searchLabel` | `string` | `'Rechercher'` |
| `v-model:search` | `string` | `''` |

Événements : `toggle-menu`, `search-submit(value)`, `notifications-click`,
`account-click`.

### Composants internes

| Composant | Entrées | Événements |
| --- | --- | --- |
| `NavRow` | `item`, `open`, `activeId`, `expanded`, `index` | `toggle(item)`, `select(leaf)` |
| `NavLeaf` | `leaf`, `active`, `wide` | `select(leaf)` |
| `BurgerButton` | `open`, `label` | le `click` est écouté par le parent |
| `BaseIcon` | `name: IconName`, `size` (22) | — |

`index` sert au décalage en cascade des libellés : il alimente `--i`.

---

## 5. Données

```ts
type IconName = 'home' | 'messages' | 'threads' | 'folder-code' | 'burger' | …

interface NavLeaf {
  id: string
  label: string
  icon: IconName
  to?: RouteLocationRaw   // rend l'entrée en <RouterLink>
  href?: string           // rend l'entrée en <a>, ignoré si `to` est là
}

interface NavGroup {
  id: string
  title?: string          // « Drafts (3) »
  action?: IconName       // icône alignée à droite de l'intitulé
  items: NavLeaf[]
}

interface NavItem extends NavLeaf {
  badge?: number          // compteur ; prioritaire sur `action`
  dot?: boolean           // pastille d'alerte sur l'icône
  action?: IconName       // icône à droite si ni badge ni enfants
  children?: NavLeaf[]    // → accordéon
  detail?: NavGroup[]     // → colonne de détail
}
```

Un onglet qui a des `children` reste un `<button>` : son rôle est de déplier. Les
`to` / `href` ne s'appliquent donc qu'aux onglets sans enfants et aux entrées
terminales.

---

## 6. Géométrie : l'invariant à ne pas casser

L'icône ne bouge **pas d'un pixel** entre les deux états, et c'est ce qui donne
l'impression que la colonne s'étend au lieu de se dédoubler. Cela repose sur trois
égalités :

```
centre de l'icône = --gutter + --slot / 2 = 16 + 22 = 38 = --rail-w / 2   ✔
pas vertical      = --slot + --row-gap    = 44 + 8  = 52  (identique dans les deux états)
--radius-pill     = --slot / 2            = 22      (cercle parfait tant que la ligne fait 44 px)
```

La ligne (`.item`) fait `width: 100%` : c'est la largeur du rail qui la fait grandir,
aucune animation de largeur ni de rayon à synchroniser. Libellés, badges et chevrons
sont en `opacity: 0` au repos et ne participent jamais au dimensionnement.

**Si vous changez `--slot`**, changez `--radius-pill` (moitié) et vérifiez
`--rail-w` (= `--slot` + 2 × `--gutter`).

---

## 7. Jetons

Tout est dans `assets/tokens.css`, sur `:root`. Aucune couleur ni dimension n'est
écrite en dur dans les composants.

| Famille | Jetons |
| --- | --- |
| encre | `--ink`, `--ink-soft`, `--ink-mute`, `--ink-muted`, `--on-ink` |
| filets | `--hair`, `--thread`, `--thread-node` |
| accent | `--accent` (pastilles de notification) |
| verre | `--surface`, `--surface-overlay`, `--surface-hover`, `--surface-hover-soft`, `--surface-raised`, `--stroke`, `--blur` |
| ombres | `--shadow-rest`, `--shadow-lifted`, `--shadow-overlay`, `--shadow-hover`, `--shadow-pill`, `--shadow-pill-soft`, `--shadow-ink`, `--shadow-handle`, `--scrim` |
| géométrie | `--gutter`, `--slot`, `--rail-w`, `--rail-open-w`, `--detail-w`, `--row-gap` |
| rayons | `--radius-surface`, `--radius-overlay`, `--radius-header`, `--radius-header-mobile`, `--radius-pill`, `--radius-leaf` |
| header | `--header-h`, `--header-h-mobile` |
| mouvement | `--ease`, `--spring`, `--dur-expand`, `--dur-slide` |
| typo | `--font-ui` |

Cas particulier : `--burger-size` n'est pas défini globalement. `BurgerButton` lit
`var(--burger-size, var(--slot))`, ce qui permet de le redimensionner depuis
n'importe quel parent sans lutte de spécificité (le header l'impose à 40 px en
mobile).

---

## 8. États

| Ce qu'on dit | Classe / valeur |
| --- | --- |
| la sidebar est déployée | `open` → `.sidebar.is-expanded` |
| l'onglet X est ouvert | `openId === 'x'` → `.item.is-open` (pilule encre) |
| l'entrée Y est active | `activeId === 'y'` → `.leaf.is-active` (pilule blanche) |
| l'accordéon est ouvert | `.sub.is-open` (`grid-template-rows: 0fr → 1fr`) |
| la colonne de détail a du contenu | `.panel.has-detail` |
| le volet mobile montre le détail | `mobilePane === 'detail'` → `.slider.show-detail` |

Replié, la ligne ouverte reste la **pastille blanche** du rail
(`.sidebar:not(.is-expanded) .item.is-open`) et bascule en encre au déploiement.

---

## 9. Comportement mobile (≤ 767 px)

- Le rail sort du flux : la **surface entière devient un volet** en `position: fixed`,
  glissé depuis la gauche par-dessus un voile.
- `.slider` fait 200 % de large et translate de −50 % : navigation à deux panneaux,
  **liste → détail**, avec un en-tête de retour (`.back`).
- Le burger interne est masqué ; c'est **celui du header** qui ouvre le volet. Une
  croix (`.head__close`) ferme depuis l'intérieur.
- `Échap` referme, le focus entre dans le volet à l'ouverture et **revient au
  déclencheur** à la fermeture. Le scroll du document est verrouillé via
  `useScrollLock` (compteur partagé, valeur d'origine restaurée).
- Choisir une entrée referme le volet.

---

## 10. Intégration dans un projet

1. Copier `types/`, `composables/`, `assets/tokens.css`, le bloc
   `prefers-reduced-motion` de `assets/base.css`, et les sept composants.
2. Importer les jetons **avant** vos styles :
   ```ts
   import './assets/tokens.css'
   ```
   `box-sizing: border-box` est supposé global (il vient de `base.css`).
3. Décrire votre navigation en `NavItem[]` (voir `data/navigation.ts` comme
   exemple), puis brancher `AppShell` autour de votre `RouterView`.
4. Réagir à `@select` pour naviguer ou charger le contenu, ou poser des `to` sur les
   entrées et laisser `vue-router` faire.
5. Rhabiller en redéfinissant les jetons.

Dépendance : `useLinkTag` importe `RouterLink`, donc `vue-router` est requis. Sans
routeur, retirez cet import et ne posez pas de `to`.

---

## 11. Points de vigilance

- **Le point de rupture existe en deux endroits** : `MOBILE_BREAKPOINT` dans
  `useBreakpoint.ts` (comportement) et les `@media (max-width: 767px)` des composants
  (apparence). Une media query ne peut pas lire une variable CSS : si vous changez la
  valeur, changez les deux, sinon le comportement et le style se désynchronisent.
- **Un seul propriétaire pour le filet de séparation** : il est porté par
  `.panel` (bord gauche), pas par le rail. Le rail n'a volontairement aucun bord
  droit : sinon le trait se dédouble à la jonction et subsiste quand la colonne de
  détail est fermée.
- **Ne jamais mettre `transition-delay` sur un raccourci qui couvre `background` ou
  `box-shadow`** dans les lignes. Le décalage en cascade doit être écrit propriété
  par propriété, sinon le retour visuel du clic est retardé d'autant (bug constaté :
  280 ms d'inertie sur le troisième sous-onglet).
- **CSS scopé et sélecteurs d'ancêtres** : les lignes se stylent depuis `NavRow` /
  `NavLeaf`, mais lisent des classes d'état posées par le parent
  (`.is-expanded`, `.sidebar:not(.is-expanded)`, `.sub.is-open`). C'est légal —
  seul le dernier maillon du sélecteur reçoit l'attribut de scope — mais ces règles
  doivent rester dans le composant qui stylise l'élément final.
- **`.rule--bottom` porte le `margin-top: auto`**, pas `ul.nav--bottom`. Sinon le
  filet reste collé au groupe du haut au lieu de suivre le groupe épinglé.
- **Visibilité et focus** : les entrées masquées utilisent `visibility: hidden` (et
  `inert` sur l'accordéon fermé), pas seulement `opacity`. Sans ça elles restent dans
  l'ordre de tabulation alors qu'elles sont invisibles.
- **`v-if` et `matchMedia`** : les éléments propres au mobile sont masqués en CSS,
  pas conditionnés en JavaScript, pour que le markup ne dépende pas d'un
  `matchMedia` résolu seulement au montage.
