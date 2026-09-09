# Inventaire — arborescence `src/`

> Snapshot doc — le code prime en cas d’écart · Relu : 2026-08-24  
> Architecture : `architecture/layers.md`

```
src/
├── main.ts · App.vue
├── app/
│   ├── stores/          # app-settings-store (localStorage)
│   └── guards/          # auth-guard (+ __tests__)
├── features/
│   ├── accounts/        # stores/internal/ (référence split)
│   ├── categories/      # arbre perso deux niveaux
│   ├── auth/            # stores/internal/ session·actions·profile·logout
│   ├── countries/
│   ├── dashboard/
│   ├── desktop/         # deep-links / helpers desktop
│   ├── friends/         # stores/internal/ + composables QR
│   ├── notifications/   # stores/internal/
│   ├── subscription/    # abonnement, plans, sélecteur / upsell (API mockée)
│   ├── tiers/           # annuaire perso de contreparties (stores/internal/)
│   ├── files/           # documents PDF perso (stores/internal/)
│   ├── transactions/    # journal, pièces PDF (stores/internal/)
│   └── user-settings/   # composables account/security
├── views/
│   ├── app/             # dashboard, finances/…, gestion/files, gestion/categories, gestion/tiers, notifications, friends, parametres/…
│   ├── front-pages/
│   ├── authentication/
│   └── dev/             # showcase /components (dev only)
├── components/
│   ├── shared/          # alert/, modal/, tabs/, color-picker/, chip/, switch/, radio/, …
│   ├── auth/
│   └── frontpages/
├── layouts/blank/ · full/
├── router/ · plugins/ · scss/ · theme/ · test/ · types/ · utils/ · data/ · assets/
└── security/            # CSP front
```

Références lecture seule à la racine repo : `_template/modernize/`, `_template/old-application/`.
