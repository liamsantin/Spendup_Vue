# Pattern — App Page Shell

> Code : `src/components/shared/page-shell/AppPageShell.vue`  
> Réf. : `views/app/gestion/tiers/AppTiersPage.vue`, `views/app/finances/transactions/AppTransactionsPage.vue`  
> Multi-onglets de module : `app-tabs-shell.md` · Relu : 2026-09-08

## Grille des pages liste

| Zone | Contenu | Slot |
| ---- | ------- | ---- |
| Hero | Titre à gauche, **onglets de vue** à droite, sous-titre dessous | `#tabs` |
| Barre d’outils | Recherche à gauche (optionnelle), **Filtre** puis **Ajouter** à droite | `#toolbar` |
| Corps | Liste / vide / chargement | défaut |
| Hero actions | Inbox, Enregistrer / Annuler — **pas** Filtre/Ajouter | `#actions` |

Les onglets changent la famille d’objets (nature, type). Filtre affine la vue courante. Si une pièce manque, la zone reste (ex. Transactions : pas de recherche, Filtre + Ajouter à droite).

## Props

`title`, `subtitle?`, `icon?`, `hideActions` (défaut `true`).

## Quand l’utiliser

- Pages `/app` liste métier (Tiers, Transactions, Catégories, Moyens de paiement).
- Paramètres dirty → `#actions` Enregistrer / Annuler (`hideActions: false`).
- Amis / Comptes (changement de module) → **App Tabs Shell**.
