# Subscription (abonnement) — contrat front

> Code : `src/features/subscription/`  
> Statut : active (contrat backend **provisoire**, mocké) · Relu : 2026-09-08  
> Voir aussi : `patterns/app-page-shell.md`, `features/user-settings/contract.md`, `reference/env.md`

## Boundaries

| Couche | Détail                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------- |
| Route  | `/app/parametres/abonnement` → `AppSettingsSubscriptionPage` (Page Shell, lecture seule)             |
| Nav    | Sidebar **Préférences** → **Abonnement** (`SETTINGS_PATHS.subscription`, legacy `?tab=Subscription`) |
| Store  | `useSubscriptionStore` — abonnement, plans publics, état du sélecteur                                |
| API    | `subscriptionApi` → `fetchWrapper`, **ou** `subscriptionMockApi` selon `VITE_SUBSCRIPTION_MOCK`      |
| Host   | `PlanSelectorHost` monté une fois dans `FullLayout` (à côté de `StepUpDialog`)                       |

## Périmètre

- **Oui** : visualisation du plan courant (nom, description, statut, dates), features incluses (cases lecture seule), quotas avec consommation (« 2 / 5 membres », illimité si `limit: null`), sélecteur de plan, confirmation, `PUT`, upsell générique.
- **Non** : formulaire de carte, 3D Secure, étape paiement, choix de plan à l’inscription, prix. Le compte démarre sur `free`.

## HTTP (provisoire)

| Méthode | Route                     | Rôle                                                       |
| ------- | ------------------------- | ---------------------------------------------------------- |
| GET     | `/api/subscription/plans` | Plans publics, avec `isCurrent`                            |
| GET     | `/api/subscription`       | Abonnement courant (`plan`, `status`, dates, `usage`)      |
| PUT     | `/api/subscription`       | `{ planCode }` — changement libre tant que pas de paiement |

Erreurs : `400` plan inconnu / inactif / non public, `400` règle métier (`message` affiché tel quel), `401`.  
Codes de plan (`free` \| `solo` \| `family`) à confirmer au seed ; les **noms de champs** sont stables.

## Mock (`mock.ts`)

Actif quand `VITE_SUBSCRIPTION_MOCK` ≠ `false`. Trois plans : `free` (défaut, `familyMembers: 0`), `solo`, `family` (`familyMembers: 5`). Abonnement `active` sur `free` sans échéance. Le `PUT` bascule le plan, remet `isCurrent`, refuse un plan inconnu ou déjà courant (`400`). `resetSubscriptionMock()` pour les tests. À supprimer avec l’arrivée du backend.

## Store

- `loadSubscription(force)` / `loadPlans(force)` : cache TTL 60 s (`resource-cache`), `isCurrent` recalculé côté front à partir de `subscription.plan.code`.
- `changePlan(code)` → `PUT`, remplace l’abonnement, propage `isCurrent` sur les plans. Erreur → `error` + rejet (message serveur tel quel).
- `openPlanSelector(reason?)` / `closePlanSelector()` : point d’entrée générique. `reason` = `{ code?, requiredPlanCode?, message? }` — affiché en sous-titre, plan requis mis en avant.
- Helpers : `hasFeature(code)`, `requiredPlanForFeature(code)`, `requiredPlanForQuota(code, needed)`, `planByCode`.
- `reset()` au logout (`auth-session.clearSession`).

## Composants

| Composant           | Rôle                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SubscriptionTab`   | Cartes Plan courant / Fonctionnalités / Quotas + bouton « Changer de plan » ; message de succès quand le plan change                                     |
| `PlanSelectorModal` | Écran autonome : cartes comparées (`PlanCard`), plan courant marqué, « Choisir » → confirmation → `PUT`. Suit `store.selectorOpen` ou un `v-model` local |
| `PlanSelectorHost`  | Monte le sélecteur globalement (upsell depuis n’importe quel écran)                                                                                      |
| `PlanUpsell`        | « {feature} nécessite le plan {plan} » + CTA vers le sélecteur. Prêt, **pas encore branché**                                                             |

## Ce qui changera avec le prestataire de paiement

Uniquement l’étape de confirmation de `PlanSelectorModal`. Les statuts `pending` / `expired` deviendront actifs. Tout le reste reste tel quel.

## Tests critiques

- `__tests__/mock.test.ts`
- `__tests__/format.test.ts`
- `stores/__tests__/subscription-store.test.ts`
