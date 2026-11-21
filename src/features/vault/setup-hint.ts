/**
 * Règle d’affichage de la proposition « Définir une phrase de Coffre » (bandeau discret de `VaultHost`).
 * Isolée ici pour être testée sans monter le composant.
 */
export interface SetupHintInput {
    /** L’hôte a relu l’état du Coffre au montage. */
    bootstrapped: boolean;
    /** La proposition a déjà été fermée pendant cette session de page. */
    dismissed: boolean;
    /** Session de démonstration : pas de Coffre, rien n’est écrit sur l’appareil. */
    demo: boolean;
    /** `false` pour un compte sans mot de passe local (Google seul), `null` si inconnu. */
    hasPassword: boolean | null | undefined;
    /** État du Coffre chargé (`null` tant qu’il ne l’est pas). */
    statusLoaded: boolean;
    /** Un Coffre existe déjà. */
    vaultExists: boolean;
    /** La proposition a déjà été montrée une fois à cet utilisateur sur cet appareil. */
    alreadyShown: boolean;
}

/**
 * Indique s’il faut proposer une phrase de Coffre : un compte Google seul, sans Coffre, une seule fois,
 * jamais en démo (l’utilisateur fictif n’a pas de mot de passe, mais ce n’est pas un compte Google, et la
 * démo ne crée pas de Coffre ni n’écrit dans le stockage de l’appareil).
 * @param input Situation de l’utilisateur et du Coffre.
 * @returns `true` si le bandeau doit s’afficher.
 */
export function shouldShowSetupHint(input: SetupHintInput): boolean {
    return (
        input.bootstrapped &&
        !input.dismissed &&
        !input.demo &&
        input.hasPassword === false &&
        input.statusLoaded &&
        !input.vaultExists &&
        !input.alreadyShown
    );
}
