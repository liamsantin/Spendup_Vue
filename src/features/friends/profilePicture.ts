import { DEFAULT_AVATAR_SRC, catalogAvatarSrc, isCatalogProfilePicture, isUploadedProfilePicture } from '@/features/auth/profilePicture';
import { getApiBaseUrl } from '@/utils/helpers/axios-helpers';

/**
 * Résout `profilePicture` renvoyé par `/api/friends*` en URL affichable.
 * - catalogue `/avatar/…` → asset local
 * - chemin relatif (`/uploads/…`, etc.) → préfixe API
 * - URL absolue → telle quelle
 * - hash upload / null / inconnu → avatar par défaut
 */
export function resolveFriendAvatarSrc(profilePicture: string | null | undefined): string {
    const value = profilePicture?.trim();
    if (!value) return DEFAULT_AVATAR_SRC;

    if (isCatalogProfilePicture(value)) {
        return catalogAvatarSrc(value);
    }

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
        return value;
    }

    if (value.startsWith('/')) {
        return `${getApiBaseUrl()}${value}`;
    }

    // Hash SHA-256 (upload) : pas d’endpoint public documenté pour les autres users.
    if (isUploadedProfilePicture(value)) {
        return DEFAULT_AVATAR_SRC;
    }

    return DEFAULT_AVATAR_SRC;
}
