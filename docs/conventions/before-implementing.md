# Avant d’implémenter

> Statut : active · Relu : 2026-08-13

## Ordre de recherche obligatoire

Avant d’ajouter ou recréer une view, un composant, une route ou un style :

1. `_template/old-application/` (structure Spend.Up cible)
2. `_template/modernize/` (thème admin / UI kit)
3. Comparer avec `src/`
4. Réutiliser / adapter — ne pas réécrire from scratch

**Ne pas modifier** les dossiers `_template/`.

## Confirmation utilisateur

Demander validation avant :

| Situation          | Exemples                                       |
| ------------------ | ---------------------------------------------- |
| Structure          | Réorg dossiers, rename massif, fusion features |
| Refactor large     | Rewrite module, migration multi-fichiers       |
| Routing            | Nouvelles URLs, suppressions de routes         |
| Architecture       | Placement composant, découpage views/features  |
| Suppression        | Fichiers, styles, features                     |
| Métier ambigu      | Auth, permissions, flux non documentés         |
| Impact transversal | Front + `/app`, ou les conventions elles-mêmes |

Petites corrections locales : OK sans confirmation.
