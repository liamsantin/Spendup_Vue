import { isCipher } from '@/features/vault/crypto';

/**
 * Comment afficher un champ du socle après tentative de déchiffrement :
 * - `plain` : valeur lisible ;
 * - `empty` : pas de valeur ;
 * - `unreadable` : chiffré avec une clé qu’on a, mais illisible (« 🔒 illisible ») ;
 * - `foreign` : chiffré par un autre utilisateur, propriétaire de la ligne (« 🔒 chiffré par le propriétaire »).
 */
export type SensitiveFieldDisplay = { kind: 'plain'; value: string } | { kind: 'empty' } | { kind: 'unreadable' } | { kind: 'foreign' };

/**
 * Qualifie une valeur telle qu’elle reste dans le store après `decrypt` (un chiffré résiduel = échec).
 * @param value Valeur du champ.
 * @param ownedByMe Vrai si la ligne appartient à l’utilisateur courant (sinon un chiffré est « étranger »).
 */
export function resolveSensitiveFieldDisplay(value: string | null | undefined, ownedByMe = true): SensitiveFieldDisplay {
    if (value == null || value === '') return { kind: 'empty' };
    if (isCipher(value)) return ownedByMe ? { kind: 'unreadable' } : { kind: 'foreign' };
    return { kind: 'plain', value };
}
