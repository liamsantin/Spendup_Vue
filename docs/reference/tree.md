# Inventaire — arborescence `src/`

> Snapshot doc — le code prime en cas d’écart · Relu : 2026-08-13  
> Architecture : `architecture/layers.md`

```
src/
├── main.ts · App.vue
├── app/
│   ├── stores/          # app-settings-store (localStorage)
│   └── guards/          # auth-guard (+ __tests__)
├── features/
│   ├── auth/
│   ├── countries/
│   ├── dashboard/
│   ├── friends/
│   ├── notifications/
│   └── user-settings/
├── views/
│   ├── app/             # dashboard, notifications, friends, parametres/…
│   ├── front-pages/
│   ├── authentication/
│   └── dev/             # showcase /components (dev only)
├── components/
│   ├── shared/          # alert/, modal/, tabs/, chip/, switch/, radio/, …
│   ├── auth/
│   └── frontpages/
├── layouts/blank/ · full/
├── router/ · plugins/ · scss/ · theme/ · test/ · types/ · utils/ · data/ · assets/
└── security/            # CSP front
```

Références lecture seule à la racine repo : `_template/modernize/`, `_template/old-application/`.
