/** Erreurs de champ du formulaire d’actif, indexées par le `field` renvoyé par `payload.ts` (ex. `vehicle.brand`). */
export type AssetFieldErrors = Partial<Record<string, string | null>>;
