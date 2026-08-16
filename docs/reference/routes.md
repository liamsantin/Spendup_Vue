# Inventaire — routes

> Source : `src/router/*` · Relu : 2026-08-13

## Public (`BlankLayout`)

> Absentes sous **Tauri** (`isTauri`) : `/` redirige vers `/auth/login`. Landings web uniquement.

| Route                        | Vue                                    |
| ---------------------------- | -------------------------------------- |
| `/`                          | `PublicHomePage`                       |
| `/fonctionnalites`           | `FeaturesPage`                         |
| `/a-propos`                  | `AboutPage`                            |
| `/tarifs`                    | `PricingPage` (si `VITE_PRICING_PAGE`) |
| `/conditions-utilisation`    | `TermsOfUsePage`                       |
| `/politique-confidentialite` | `PrivacyPolicyPage`                    |
| `/components`                | showcase — `devOnly`                   |

## Auth

| Route                             | Notes                         |
| --------------------------------- | ----------------------------- |
| `/auth/login`                     | + notice sessionStorage       |
| `/auth/register`                  | → confirm-email               |
| `/auth/forgot-password`           | `?token=` / `#token=` → reset |
| `/auth/reset-password`            | alias forgot                  |
| `/auth/two-step`                  | 2FA challenge                 |
| `/auth/confirm-email`             |                               |
| `/auth/confirm-email-change`      |                               |
| `/auth/404` · `/auth/maintenance` |                               |

## Application (`FullLayout`, `requiresAuth`)

| Route                   | Feature                                        |
| ----------------------- | ---------------------------------------------- |
| `/app`                  | dashboard                                      |
| `/app/comptes`          | user-settings (Tabs Shell)                     |
| `/app/finances/comptes` | accounts (Tabs Shell : Accounts / Invitations) |
| `/app/notifications`    | notifications (Page Shell)                     |
| `/app/friends`          | friends (Tabs Shell)                           |
| `/app/applications`     | redirect → `/app/comptes`                      |

Catch-all → `Error`.
