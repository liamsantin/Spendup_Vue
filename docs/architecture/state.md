# État (Pinia)

> Convention détaillée : `conventions/pinia.md` · Inventaire : `reference/stores.md`  
> Statut : active · Relu : 2026-08-13

## Scopes

| Portée         | Emplacement                  | Exemple                                              |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| Global (shell) | `app/stores/`                | `app-settings-store` (thème/layout → `localStorage`) |
| Métier         | `features/<domaine>/stores/` | `auth-store`, `notifications-store`, …               |

## Style obligatoire

Setup Store uniquement :

```ts
export const useExampleStore = defineStore('example', () => {
    const items = ref<Item[]>([]);
    async function fetchItems() {
        /* … */
    }
    return { items, fetchItems };
});
```

Options API Pinia (`state` / `getters` / `actions`) : **interdit**.

## Persistence

| Store                  | Persistence                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `app-settings`         | `localStorage` (`spendup_app_settings`)                                                  |
| Auth session           | cookies HttpOnly (P1) et/ou sessionStorage selon mode — voir `features/auth/contract.md` |
| Autres features métier | mémoire process ; `reset()` au logout                                                    |

## Clients vs stores

Les composants UI appellent le **store** de la feature, pas le client HTTP.
