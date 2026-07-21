# Guide d’intégration Frontend (Vue.js)

**Public :** développeur Vue (Vite / Nuxt / Vue CLI)  
**API :** Spendup — auth uniquement pour l’instant (`/api/auth/*`)  
**Dernière mise à jour :** 2026-07-21

Ce document décrit **tout ce que le front doit savoir** pour brancher l’auth.  
Référence backend détaillée : `Docs/Features/authentication/feature-authentification.md`.

---

## 1. Base URL & CORS

| Environnement | Base URL typique                                                |
| ------------- | --------------------------------------------------------------- |
| Local API     | `http://localhost:5124`                                         |
| Prod          | URL publique HTTPS de l’API (ex. `https://api.votredomaine.ch`) |

Toutes les routes auth : **`{BASE_URL}/api/auth/...`**

### CORS (obligatoire)

L’API **refuse de démarrer** si `Cors:AllowedOrigins` est vide.  
L’origine exacte du front (schéma + host + port) doit être listée côté API.

En Dev, déjà autorisées notamment :

- `http://localhost:5173` (Vite)
- `http://localhost:3000`
- `http://localhost:5124`

En prod : ajouter l’origine du site Vue (ex. `https://app.spendup.ch`) dans la config API / variables d’env.

Le front n’a **pas** besoin de cookies pour l’auth : tokens dans le body / header.

---

## 2. Enveloppe de réponse (toujours)

Toutes les réponses JSON sont wrappées :

```json
{
    "success": true,
    "message": null,
    "result": {}
}
```

| Champ     | Rôle                                               |
| --------- | -------------------------------------------------- |
| `success` | `true` = OK, `false` = erreur métier / validation  |
| `message` | Message d’erreur à afficher (ou `null`)            |
| `result`  | Payload typé, ou `null` sur les actions sans corps |

**Important :** même les actions « vides » (confirm email, logout, etc.) renvoient **HTTP 200** + :

```json
{ "success": true, "message": null, "result": null }
```

### Gestion côté Vue (axios / fetch)

1. Lire le status HTTP **et** `body.success`.
2. Succès métier → utiliser `body.result`.
3. Erreur → afficher `body.message` (souvent en anglais aujourd’hui).
4. Codes typiques : `400` validation/métier, `401` auth, `404` not found.

JSON en **camelCase** (ASP.NET Core par défaut).

---

## 3. Tokens — règles critiques

| Token            | Où le stocker (reco)                                                                                                                              | Durée défaut | Usage                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| `accessToken`    | mémoire (Pinia/Vuex) + éventuellement `sessionStorage`                                                                                            | **15 min**   | Header `Authorization: Bearer {accessToken}`                  |
| `refreshToken`   | stockage persistant **sécurisé** (`localStorage` ou mieux httpOnly cookie _si_ vous ajoutez ce mode plus tard — **aujourd’hui : body JSON only**) | **30 jours** | `POST /api/auth/refresh`                                      |
| `twoFactorToken` | mémoire courte uniquement                                                                                                                         | **5 min**    | Uniquement `POST /api/auth/2fa/verify` — **jamais** sur `/me` |

### Header protégé

```http
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
```

### Intercepteur recommandé (Vue)

1. Sur **401** d’une route protégée → tenter **un** refresh avec le `refreshToken`.
2. Si refresh OK → stocker les **nouveaux** `accessToken` + `refreshToken` (rotation) → rejouer la requête.
3. Si refresh KO → logout local + redirect login.
4. **Ne jamais** envoyer le `twoFactorToken` comme Bearer sur les routes `[Authorize]`.

### Invalidation immédiate de l’access JWT

Après **reset password**, **change password**, **confirm email change**, l’ancien access JWT est **immédiatement invalide** (même avant 15 min).  
Le front doit forcer un logout / nouveau login.

Réutilisation d’un refresh déjà consommé → **toutes** les sessions de la famille sont révoquées (détection de vol) → logout partout.

---

## 4. Device (recommandé)

Sur `login`, `google`, `2fa/verify`, envoyer si possible :

```json
{
    "deviceIdentifier": "uuid-stable-par-navigateur",
    "deviceName": "Chrome Windows"
}
```

- `deviceIdentifier` : UUID stable (généré une fois, stocké localement).
- `deviceName` : libellé lisible (UA simplifié).

Optionnels, mais utiles pour l’audit sessions.

---

## 5. Flux à implémenter

### 5.1 Inscription → vérif email → login

```txt
POST /register
  → afficher « vérifiez votre email » (même si email déjà pris — anti-énumération)
POST /confirm-email  { email, code }     // code 6 chiffres
POST /login
  → si requiresTwoFactor === false → stocker tokens
  → si requiresTwoFactor === true  → écran 2FA → POST /2fa/verify
```

**Mot de passe :** ≥ 8 caractères, **au moins une lettre et un chiffre**.

`register` **ne renvoie pas** de tokens. Il faut confirmer l’email puis login.

### 5.2 Login email / mot de passe

```txt
POST /login
  ├─ requiresTwoFactor: false → accessToken + refreshToken + expiresAt + userPublicId
  └─ requiresTwoFactor: true  → twoFactorToken seulement → écran code TOTP / recovery
```

Email non vérifié **ou** mauvais MDP → **même message** (`Invalid email or password.`) — ne pas distinguer côté UI.

### 5.3 Google Sign-In

1. Front obtient un **Google ID token** (GIS : `google.accounts.id` / One Tap / bouton).
2. `POST /google` avec `{ idToken, deviceIdentifier?, deviceName? }`.
3. Même branche 2FA que le login.

**Client ID Google** : celui configuré côté API (`Authentication:Google:ClientId`) — le front utilise le **même** Client ID Web.

Règles métier :

- Google refuse si `email_verified` Google est faux.
- Même email qu’un compte local → **lien auto** puis session.
- Après changement d’email local, le lien Google est **retiré**.

### 5.4 Refresh

```txt
POST /refresh  { refreshToken }
→ nouveaux accessToken + refreshToken (+ expiresAt, userPublicId)
→ remplacer les deux tokens (rotation)
```

### 5.5 Logout

```txt
POST /logout  { refreshToken? }
+ header Bearer optionnel
→ vider le store local dans tous les cas
```

### 5.6 Mot de passe oublié

```txt
POST /forgot-password  { email }     // toujours « OK » (pas d’énumération)
→ page front /reset-password?token=...
POST /reset-password  { token, newPassword }
→ rediriger login (toutes sessions invalidées)
```

L’API envoie un mail avec lien basé sur `Email:PasswordResetBaseUrl`  
→ **à configurer côté API** vers la route Vue réelle, ex.  
`https://app.spendup.ch/reset-password`  
Le mail ajoute `?token=...`.

### 5.7 2FA (TOTP)

**Activer (utilisateur connecté) :**

```txt
POST /2fa/setup     → secret + otpAuthUri + recoveryCodes  (afficher UNE fois, QR via otpAuthUri)
POST /2fa/enable    { code }   // code app Authenticator
```

**Challenge après login / Google :**

```txt
POST /2fa/verify {
  twoFactorToken,
  code,                 // TOTP 6 chiffres OU recovery code
  deviceIdentifier?,
  deviceName?
}
→ AuthTokensResponse
```

**Désactiver :** `POST /2fa/disable` `{ code }` (JWT).

Recovery codes : usage unique. Les afficher / faire télécharger **une seule fois** au setup.

---

## 6. Catalogue des endpoints

Préfixe : **`/api/auth`**

| Méthode  | Route                   | Auth              | Body                                            | `result`                          |
| -------- | ----------------------- | ----------------- | ----------------------------------------------- | --------------------------------- |
| `POST`   | `/register`             | —                 | email, password, firstName?, name?              | `{ email }`                       |
| `POST`   | `/confirm-email`        | —                 | email, code                                     | `null`                            |
| `POST`   | `/resend-verification`  | —                 | email                                           | `null`                            |
| `POST`   | `/login`                | —                 | email, password, deviceIdentifier?, deviceName? | `AuthSession`                     |
| `POST`   | `/google`               | —                 | idToken, deviceIdentifier?, deviceName?         | `AuthSession`                     |
| `POST`   | `/2fa/verify`           | —                 | twoFactorToken, code, device…?                  | `AuthTokens`                      |
| `POST`   | `/refresh`              | —                 | refreshToken                                    | `AuthTokens`                      |
| `POST`   | `/logout`               | refresh et/ou JWT | refreshToken?                                   | `null`                            |
| `GET`    | `/me`                   | JWT               | —                                               | profil                            |
| `POST`   | `/forgot-password`      | —                 | email                                           | `null`                            |
| `POST`   | `/reset-password`       | —                 | token, newPassword                              | `null`                            |
| `POST`   | `/password/change`      | JWT               | currentPassword, newPassword                    | `null`                            |
| `POST`   | `/email/change`         | JWT               | currentPassword, newEmail                       | `null`                            |
| `POST`   | `/email/confirm-change` | —                 | email, code                                     | `null`                            |
| `POST`   | `/google/unlink`        | JWT               | currentPassword                                 | `null`                            |
| `DELETE` | `/account`              | JWT               | currentPassword? **ou** googleIdToken?          | `null`                            |
| `POST`   | `/2fa/setup`            | JWT               | —                                               | secret, otpAuthUri, recoveryCodes |
| `POST`   | `/2fa/enable`           | JWT               | code                                            | `null`                            |
| `POST`   | `/2fa/disable`          | JWT               | code                                            | `null`                            |

### Formes `result` utiles

**AuthSession** (`login` / `google`) :

```json
{
    "requiresTwoFactor": false,
    "twoFactorToken": null,
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "expiresAt": "2026-07-20T21:15:00Z",
    "userPublicId": "..."
}
```

Si 2FA :

```json
{
    "requiresTwoFactor": true,
    "twoFactorToken": "eyJ...",
    "accessToken": null,
    "refreshToken": null,
    "expiresAt": null,
    "userPublicId": null
}
```

**AuthTokens** (`refresh` / `2fa/verify`) :

```json
{
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "expiresAt": "2026-07-20T21:15:00Z",
    "userPublicId": "..."
}
```

**Me** (`GET /me`) :

```json
{
    "userPublicId": "...",
    "email": "user@example.com",
    "firstName": "Ada",
    "name": "Lovelace",
    "emailVerified": true,
    "twoFactorEnabled": false
}
```

**2FA setup** :

```json
{
    "secret": "BASE32...",
    "otpAuthUri": "otpauth://totp/Spendup:user@example.com?secret=...",
    "recoveryCodes": ["xxxx-xxxx", "..."]
}
```

---

## 7. Écrans Vue à prévoir (checklist)

| Écran / feature          | Endpoints                               |
| ------------------------ | --------------------------------------- |
| Inscription              | `register`                              |
| Saisie code email        | `confirm-email`, `resend-verification`  |
| Login                    | `login` → éventuellement écran 2FA      |
| Challenge 2FA            | `2fa/verify`                            |
| Google bouton            | GIS + `google`                          |
| Mot de passe oublié      | `forgot-password`                       |
| Reset (route `?token=`)  | `reset-password`                        |
| Profil                   | `me`                                    |
| Changer MDP              | `password/change` → **re-login**        |
| Changer email            | `email/change` + `email/confirm-change` |
| Activer / désactiver 2FA | `2fa/setup`, `enable`, `disable`        |
| Unlink Google            | `google/unlink`                         |
| Supprimer compte         | `DELETE /account`                       |
| Session globale          | refresh interceptor + logout            |

---

## 8. Limites / messages UX

| Cas                           | Comportement API                       | UX front                                                          |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| Register email déjà pris      | Même succès `{ email }`                | Message neutre « si un compte existe… »                           |
| Login email non vérifié       | Même erreur que mauvais MDP            | Message générique                                                 |
| Forgot / resend email inconnu | Toujours OK                            | Message neutre                                                    |
| Rate-limit emails             | ~5 / email / h et ~20 / IP / h         | Afficher `message`, proposer réessai plus tard                    |
| Lockout login                 | 5 échecs / email (ou 30 / IP) / 15 min | Afficher `message`, countdown éventuel                            |
| Verify 2FA                    | Rate-limit + token one-shot            | Si KO, peut falloir **re-login** pour un nouveau `twoFactorToken` |
| Compte Google-only delete     | Passer `googleIdToken` (pas de MDP)    | Brancher GIS avant delete                                         |

---

## 9. Exemple client minimal (TypeScript / fetch)

```ts
const API = import.meta.env.VITE_API_BASE_URL; // ex. http://localhost:5124

type ApiResponse<T> = {
    success: boolean;
    message: string | null;
    result: T;
};

async function api<T>(path: string, options: RequestInit = {}, accessToken?: string | null): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    const res = await fetch(`${API}${path}`, { ...options, headers });
    const body = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !body.success) {
        throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return body;
}

// Login
const { result } = await api<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
        email,
        password,
        deviceIdentifier: getOrCreateDeviceId(),
        deviceName: navigator.userAgent.slice(0, 80)
    })
});

if (result.requiresTwoFactor) {
    // → router.push({ name: 'TwoFactor', state: { twoFactorToken: result.twoFactorToken } })
} else {
    // → store.setSession(result)
}
```

Variables d’env Vue recommandées :

```env
VITE_API_BASE_URL=http://localhost:5124
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

(`VITE_GOOGLE_CLIENT_ID` = même valeur que `Authentication:Google:ClientId` côté API.)

---

## 10. Hors scope actuel

L’API n’expose **pas encore** : comptes bancaires, budgets, transactions, etc.  
Seule la couche **Auth** est intégrable aujourd’hui.

Pages Tools HTML (`/tools/*`) = Dev only, pas pour le front prod.

Collection Postman : `Postman/Spendup_Api.postman_collection.json`.

---

## 11. Checklist avant premier appel depuis Vue

1. API up (`http://localhost:5124` ou prod).
2. Origine Vue listée dans `Cors:AllowedOrigins`.
3. `VITE_API_BASE_URL` correct (pas de slash final obligatoire ; paths commencent par `/api/...`).
4. Google : même Client ID Web front + API.
5. Reset MDP : `Email:PasswordResetBaseUrl` pointe vers la route Vue (`…/reset-password`).
6. Intercepteur refresh + purge tokens sur logout / 401 définitif.
7. Ne jamais logger access/refresh/2FA tokens.
