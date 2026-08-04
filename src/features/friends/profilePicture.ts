import { DEFAULT_AVATAR_SRC, catalogAvatarSrc, isCatalogProfilePicture, isUploadedProfilePicture } from '@/features/auth/profilePicture';
import { getApiBaseUrl } from '@/utils/helpers/axios-helpers';

const USER_AVATAR_API_PATTERN = /^\/api\/users\/([^/]+)\/avatar\/?$/i;

/** Extrait le `publicId` d’un `photoUrl` notif `/api/users/{publicId}/avatar`. */
export function extractPublicIdFromUserAvatarPath(path: string | null | undefined): string | null {
    if (!path) return null;
    const trimmed = path.trim();
    const withoutBase =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
            ? (() => {
                  try {
                      return new URL(trimmed).pathname;
                  } catch {
                      return trimmed;
                  }
              })()
            : trimmed;
    const match = withoutBase.match(USER_AVATAR_API_PATTERN);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function needsUserAvatarFetch(profilePicture: string | null | undefined): boolean {
    return isUploadedProfilePicture(profilePicture?.trim() ?? '');
}

/**
 * Résolution synchrone (catalogue / URL / chemin relatif hors endpoint avatar auth).
 * Retourne `null` si un fetch auth blob est requis (hash upload).
 */
export function resolveFriendAvatarSrc(profilePicture: string | null | undefined): string | null {
    const value = profilePicture?.trim();
    if (!value) return DEFAULT_AVATAR_SRC;

    if (isCatalogProfilePicture(value)) {
        return catalogAvatarSrc(value);
    }

    if (needsUserAvatarFetch(value)) {
        return null;
    }

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
        return value;
    }

    // Endpoint avatar auth : ne pas coller en src img (Bearer requis).
    if (extractPublicIdFromUserAvatarPath(value)) {
        return null;
    }

    if (value.startsWith('/')) {
        return `${getApiBaseUrl()}${value}`;
    }

    return DEFAULT_AVATAR_SRC;
}

export { DEFAULT_AVATAR_SRC };
