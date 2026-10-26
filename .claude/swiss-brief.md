# Brief — nouvelle D.A. « Minimal × Swiss Helvetica » pour les pages /app de Spend.Up

Projet : `T:\Spend.Up\Spendup_Vue` (Vue 3 + TypeScript + Vuetify 3 + Pinia + vue-i18n, Vite). Dev server déjà lancé par la session principale sur http://localhost:5173 (ne pas en lancer un autre, ne pas utiliser les outils navigateur : le panneau navigateur est utilisé par la session principale).

## À lire avant de coder

1. La spec complète : `C:\Users\lsant\Downloads\new design\spendup-swiss-ui.md` (tout lire ; la section « Ce qu'il ne faut PAS faire » prime).
2. Les maquettes PNG du dossier `C:\Users\lsant\Downloads\new design\` (ouvrir avec l'outil Read celles de ton périmètre) : 01-apercu, 02-transactions, 03-comptes, 04-comptes-nouveau-compte, 05-recurrences, 06-planification, 07-analyses, 08-tiers, 09-tiers-menu-ajouter, 10-profil.
3. Les jetons : `src/layouts/shell/assets/tokens.css`.
4. Le kit CSS global (classes `su-*`) : `src/assets/glass/page.css`, `controls.css`, `content.css`, `overlays.css`, `motion.css`.

## Déjà fait (NE PAS MODIFIER ces fichiers)

- `src/layouts/shell/**` (sidebar 272 px, header 72 px), `src/layouts/full/**`, `src/assets/glass/**`, `src/layouts/shell/assets/tokens.css`, `src/theme/**`, `src/scss/**`, `index.html`, `src/components/shared/**` (AppPageShell, AppTabsShell, AppBoard, AppBoardSearch, AppDataTable, AppModalBase, AppConfirmationModal, AppSelect, AppSwitch, AppDropdownFilter, AppGlassCard…) — tous déjà restylés Swiss.
- Si tu as besoin d'un changement dans ces fichiers partagés : fais-le plutôt dans un `<style scoped>` de ton composant, et signale-le dans ton rapport final.

## Jetons CSS disponibles (`var(--…)`)

- Couleurs : `--bg`, `--ink` (texte principal, filets structurants), `--gray` (texte secondaire), `--line` (filets fins, bordures de champs), `--soft` (survol), `--raise` (menus/modales), `--blue` (marque : graphiques, marqueurs), `--blue-ink` (texte bleu lisible, montants positifs, liens), `--blue-btn` (fond bouton principal), `--blue-soft`, `--violet` / `--violet-ink` (épargne, dépassement, alerte), `--danger` / `--danger-line` / `--danger-soft`, `--scrim`.
- Teintes de catégorie (fond / encre) : `--t-blue-bg` `--t-blue-ink` (revenu, virement, entreprise), `--t-violet-*` (loisirs, abonnements, organisation), `--t-amber-*` (alimentation, shopping, administration), `--t-teal-*` (transport, personne), `--t-rose-*` (logement), `--t-green-*` (santé), `--t-gray-*` (non précisé).
- Montants : `rgb(var(--amount-credit))` = bleu lisible (positif), `rgb(var(--amount-debit))` = noir (négatif). Jamais de vert pour le positif.
- Typo : `--font-ui` (Helvetica Neue / Helvetica / Inter Tight / Arial), `--font-mono` (IBAN, identifiants). Chiffres en `font-variant-numeric: tabular-nums`.
- Espacement : `--section-gap` (56 px), `--ease`.
- Alias hérités (toujours valables) : `--hair` = `--line`, `--ink-muted` = `--gray`, `--ink-mute` (gris foncé), `--surface` / `--surface-raised` = blanc, `--radius-*` = 0, `--shadow-*` = none, `--shadow-offset` = ombre décalée nette (menus/modales uniquement).
- Mode sombre : automatique si tu n'utilises que des variables (jamais de couleur en dur type `rgba(16,16,20,…)`, `#fff`, `#8a8172`).

## Classes du kit à réutiliser (voir les fichiers CSS pour le détail)

- Page : `su-page`, `su-hero` (h1 40 px + sous-titre, filet 2 px dessous — rendus par `AppPageShell` / `AppTabsShell` : ne pas ajouter de h1), `su-hero__actions`, `su-tabs` / `su-tab` (texte seul, actif = 700 souligné 2 px), `su-toolbar`, `su-body`.
- Boutons : `su-btn` (secondaire : bordure 1 px noire), `su-btn su-btn--ink` (principal bleu), `su-btn--ghost` (discret : bordure `--line`, texte gris 400, ex. « Période · Octobre »), `su-btn--danger`, `su-btn--warn` (violet), `su-btn--tonal`, `su-btn--sm` ; `su-orb` (bouton-icône carré nu), `su-link` (lien « Tout voir → », ajoute la flèche automatiquement).
- Recherche : `su-search` + `su-search__icon` + `su-search__input` (simple ligne 1 px noire en bas).
- Données : `su-figs` + `su-fig` / `su-fig__label` / `su-fig__num` / `su-fig__note` (chiffre clé : filet 2 px, libellé 13 px, chiffre 30 px 700, note grise) ; `su-hero-num` (chiffre héros 76 px, `<small>` pour les décimales grises) ; `su-pos` / `su-neg` / `su-over`.
- Sections : `su-section` + `su-section__head` (h2 16 px 700 sur filet 2 px, lien à droite) ou `su-h2` ; `AppGlassCard` (= `su-panel`, déjà restylé : filet 2 px, titre, sans boîte) ; `su-g12` (grille 12 colonnes, gouttière 32, utiliser `grid-column: span N` en scoped) ; `su-split` ; `su-stack` / `su-stack--tight`.
- Lignes : `su-person` (36 px icône | nom 700 + sous-ligne grise | actions, filet fin au-dessus) + `su-person__avatar su-person__avatar--tile` (carré 36 px teinté) ou `su-tile su-tile--{blue|violet|amber|teal|rose|green}` + `su-person__meta` / `su-person__name` / `su-person__sub` / `su-person__actions` / `su-person__amount` ; `su-chip` (petit carré 7 px de couleur via `--chip-color` + texte gris ; `su-chip--plain` sans carré) ; `su-sq` (carré 7 px, `--sq-color`).
- Tableaux : `su-table-wrap` > `su-table` (th 12.5 px gris sur filet 2 px, td 12 px de padding sur filet fin, `.is-num` à droite) ; ou `AppDataTable` (déjà Swiss, classes `app-data-table__row/__name/__avatar/__identity/__title/__muted/__strong/__num/__pill/__pill-label/__actions`, `--tint` pour la couleur).
- Réglages : `su-settings` > `su-settings__lead` (h2 + p) + `su-settings__fields` (grille 2 colonnes, `.is-full` pour pleine largeur) ; `su-settings--danger` (titre rouge) ; `su-kv` / `su-kv--strong` (ligne libellé / valeur).
- Jauges : `su-gauge` > `su-gauge__fill` (`--blue`, `--over` violet) ; pour une jauge segmentée (20 carrés), la composer en scoped.
- Menus : `su-menu` (v-sheet) + `su-menu-item` / `su-menu-item__icon` / `su-menu-item__title` / `su-menu-item__desc` ; modales : `AppModalBase` (déjà Swiss).
- États : `su-empty`, `su-loading`, `su-spin`, `su-more`.

## Règles de la D.A. (résumé, la spec fait foi)

1. Pas de cartes : supprimer dans tes `<style scoped>` tout `background` de bloc, `border-radius` (sauf photo / avatar / pastille de notification / interrupteur / pastille de couleur, qui restent ronds), `box-shadow`, `backdrop-filter`, dégradés. Les blocs flottent sur le fond blanc, séparés par l'espace (56 px entre sections) et par des filets : 2 px `--ink` pour structurer, 1 px `--line` pour séparer des lignes.
2. La typographie fait la hiérarchie : deux graisses (400 / 700), jamais de 500/600/650 ; pas de majuscules (sauf sigles) ; h2 de section 16 px 700 ; libellés 13 px ; chiffres clés 30 px 700 ; corps 14 px ; chiffres tabulaires.
3. Couleurs : bleu = donnée clé, action principale, montant positif (avec « + », couleur `--blue-ink`) ; noir = montant négatif (vrai signe moins « − » U+2212) ; violet = épargne, dépassement, accent secondaire ; tout le reste noir / gris / blanc. Pas d'arc-en-ciel de pilules colorées ; une catégorie = carré 36 px teinté avec pictogramme trait 18 px + petit carré 7 px de sa couleur + nom en gris.
4. Formes : tout est carré. Pictogrammes trait (vue-tabler-icons ou Solar line) ; jamais d'emoji, jamais d'initiales dans une icône.
5. Graphiques éditoriaux : courbe 2 px bleue sans aplat, grille pointillée grise, valeurs écrites directement aux extrémités ; colonnes carrées gris `--line`, période courante en bleu avec sa valeur ; jauges carrées 4–6 px (dépassement violet) ; répartition = barre empilée carrée (bleu / violet / bleu pâle / noir) avec légende alignée sous chaque segment.
6. Transactions groupées par jour façon horaire CFF (maquette 02) : par jour, filet 2 px noir, colonne gauche 132 px (numéro du jour 48 px 700, jour de la semaine 700, nombre d'opérations gris, total du jour 700 bleu si positif), lignes d'opération à droite (grille `36px | nom 1fr | catégorie | montant 120px`, filets fins), aucun fond gris.
7. Formats : montants suisses déjà gérés par les helpers du projet (`Intl`, `resolveTransactionAmountDisplay`, etc.) — ne pas réécrire la logique de formatage ; si l'affichage des milliers n'utilise pas l'apostrophe, laisse-le tel quel et signale-le. Devise « CHF » en petit gris. Liens d'action terminés par « → » (classe `su-link`).
8. Accessibilité : vrais `<button>` / `<a>` / `<label>`, `aria-label` sur les boutons-icônes, cibles ≥ 40 px, jamais une information par la couleur seule.
9. Mobile (< 768 px) : les grilles s'empilent, la colonne « jour » de 132 px devient une ligne, les tableaux passent en `overflow-x: auto`.

## Contraintes de code

- Restyle visuel uniquement : props, emits, stores, appels API, clés i18n, routes et tests restent intacts. La structure du template peut changer pour la mise en page, sans régression fonctionnelle. Les textes existants (i18n) sont conservés ; n'ajoute une clé i18n (fr + en dans `src/utils/locales/`) que si un nouveau libellé est indispensable.
- Styles spécifiques dans le `<style scoped>` du composant, via les variables CSS. Commentaires en français. Aucune dépendance ajoutée.
- Ne touche qu'aux fichiers de ton périmètre.
- Avant de rendre : `npx prettier --write <tes fichiers>`, `npx eslint <tes fichiers>` (0 erreur), `npx vue-tsc --noEmit` (0 erreur), et `npx vitest run <dossiers de tests de ton périmètre>` s'il y en a.
- Rapport final : fichiers modifiés, description de chaque page/composant après restyle, ce qui n'a pas pu être fait et pourquoi, et tout besoin de changement dans le kit partagé.
