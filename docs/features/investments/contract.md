# Placements — contrat front

> Code : `src/features/investments/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/accounts/contract.md`, `features/net-worth/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route    | `/app/patrimoine/placements/:accountPublicId?` → `AppInvestmentsPage` (Page Shell ; sans paramètre ou paramètre inconnu → `router.replace` 1er compte)  |
| Nav      | Sidebar **Patrimoine** → **Placements**                                                                                                                 |
| Stores   | `useInvestmentsStore` (state · positions · operations · realtime · lifecycle) + `useInstrumentsStore` (catalogue, store simple)                         |
| API      | `investmentsApi` (positions, opérations) et `instrumentsApi` via **`fetchWrapper`**                                                                     |
| Droits   | Compte `investissement` / `crypto` actif. Lecture : owner + co-détenteurs. Écriture d’opérations et de cours : `myRole === 'owner'` (sinon 404 serveur) |
| Realtime | `accountChanged` `investmentOperation*` / `investmentPriceUpdated` (pas d’événement instrument)                                                         |

Un placement est une **position sur un compte**, jamais un actif. Le catalogue d’instruments est **personnel** (deux utilisateurs peuvent avoir le même symbole). Le cours est **manuel**.

Composants exportés : `InvestmentsWorkspace` (`accountPublicId` ; `defineExpose({ openCreateOperation, openCreateInstrument })`), `InvestmentAccountPicker` (`v-model` publicId, `accounts`), `PositionsTable` (`result`, `account`, `acting`, `canWrite`, `loading`, `includeClosed` ; émet `updatePrice`, `editInstrument`, `update:includeClosed`), `OperationsList` (`page`, `filters`, `instruments`, `loading`, `acting`, `canWrite` ; émet `filter`, `loadMore`, `edit`, `delete`), `InstrumentPicker` (`v-model`, `fallbackLabel`, `defaultCurrency` ; émet `created`), `InstrumentFormModal`, `InstrumentPriceModal`, `OperationFormModal`.

## HTTP

Auth JWT. Enveloppe `{ success, message, result }` sauf DELETE → **204**.

| Méthode | Route                                                                               | Résultat                        |
| ------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| GET     | `/api/instruments?search=&type=&page=&pageSize=`                                    | Page (50, max 200), tri symbole |
| GET     | `/api/instruments/{publicId}`                                                       | Détail                          |
| POST    | `/api/instruments`                                                                  | Création (+ cours initial)      |
| PUT     | `/api/instruments/{publicId}`                                                       | État complet sans cours         |
| POST    | `/api/instruments/{publicId}/price`                                                 | `{ price, date? }`              |
| DELETE  | `/api/instruments/{publicId}`                                                       | 400 si opération / position     |
| GET     | `/api/accounts/{id}/positions?includeClosed=`                                       | Positions + totaux              |
| GET     | `/api/accounts/{id}/operations?instrumentPublicId=&type=&from=&to=&page=&pageSize=` | Page, plus récent d’abord       |
| GET     | `/api/accounts/{id}/operations/{publicId}`                                          | Détail                          |
| POST    | `/api/accounts/{id}/operations`                                                     | Création + rejeu (owner)        |
| PUT     | `/api/accounts/{id}/operations/{publicId}`                                          | État complet                    |
| DELETE  | `/api/accounts/{id}/operations/{publicId}`                                          | Soft-delete + rejeu             |

404 → messages neutres : `Instrument introuvable.`, `Opération introuvable.` (retrait local du journal), `Compte de placement introuvable.` (oubli du compte). 400 → `message` serveur affiché tel quel.

## Objet renvoyé

- Instrument : `symbol` en majuscules, `isin` 12 caractères ou `null`, `lastPrice` / `lastPriceDate` `null` tant qu’aucun cours.
- Position : `marketValue` = quantité × (`lastPrice` ?? PRU) ; `hasQuote: false` → « sans cours, valeur au coût ». Totaux `null` + `mixedCurrencies: true` si plusieurs devises → « devises mixtes : totaux indisponibles ». Sans `includeClosed`, positions soldées masquées (interrupteur dans `PositionsTable`, mémorisé par compte).
- Opération : `currency` = devise de l’instrument, `instrument` embarqué, `transactionPublicId` nullable.

## Règles

- Instrument : `symbol` (≤ 20) / `name` (≤ 150) / `type` / `currency` obligatoires ; ISIN facultatif validé côté client (format + Luhn). `symbol`, `type`, `currency` figés dès qu’une opération existe (400 serveur affiché).
- Cours : ≥ 0, 4 décimales, date ≤ aujourd’hui (fuseau settings) ; omise = aujourd’hui.
- Opération : date valide non future. `achat` / `vente` / `depot` / `retrait` → quantité > 0 (8 décimales) et prix ≥ 0 ; total facultatif, **pré-rempli à q × p** dans la modale tant qu’il n’est pas saisi à la main. `dividende` / `frais` → ni quantité ni prix, total > 0. Notes ≤ 500.
- Rejeu serveur : une vente / un retrait qui rendrait la quantité négative (y compris en modifiant / supprimant une opération passée) → 400 affiché.
- `transactionPublicId` (jambe cash) : **pas de sélecteur** pour l’instant. `null` à la création ; conservé tel quel en modification ; interdit pour `depot` / `retrait` (validation client).
- Après chaque écriture d’opération : mutation locale mémorisée 2,5 s, invalidation + refetch positions et journal du compte, `loadAccountDetail(id, true)` (solde).

## Realtime

`accountChanged` (`subscribeToAccountChanged`) :

- `investmentOperationCreated` / `Updated` / `Deleted` → invalide le compte ; ignoré si mutation locale récente, sinon refetch positions + journal (microtask dédupliquée) si le compte est chargé.
- `investmentPriceUpdated` → invalide, refetch des positions du compte chargé et des instruments visibles (pas d’anti-écho : le cours peut venir d’un autre compte porteur).
- Les autres `change` sont ignorés.

## Bootstrap

- `useInvestmentsStore().onAuthenticatedSession()` branche le temps réel **sans** charger ; `useInstrumentsStore().onAuthenticatedSession()` est un no-op (symétrie).
- `bootstrap(accountPublicId)` charge positions + journal (page 1) ; appelé par `InvestmentsWorkspace` au montage / changement de compte ; refetch forcé au retour de visibilité.
- `reset()` (logout) vide caches, listes, mutations locales et coupe l’abonnement.

## Tests critiques

- `__tests__/payload.test.ts` : instrument (symbole, ISIN, cours initial, date future), cours, opération par type, transaction sur dépôt, total suggéré, dirty.
- `__tests__/format.test.ts` : comptes de placement / droits, ISIN, parse quantité / prix, montant signé, signes `+` / `−`, totaux mixtes, chemins.
- `stores/__tests__/investments-store.test.ts` : bootstrap, filtres / soldées, pagination, CRUD + refetch, 400 tel quel, 404 neutres, mutation locale ignorée, refetch externe, `investmentPriceUpdated`, `onAuthenticatedSession`, `reset`.
- `stores/__tests__/instruments-store.test.ts` : liste normalisée, recherche sélecteur, CRUD + cours, date future, 400, 404, reset.
