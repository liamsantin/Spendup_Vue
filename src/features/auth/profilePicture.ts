import user1 from '@/assets/images/profile/avatar/user-1.jpg';
import user2 from '@/assets/images/profile/avatar/user-2.jpg';
import user3 from '@/assets/images/profile/avatar/user-3.jpg';
import user4 from '@/assets/images/profile/avatar/user-4.jpg';
import user5 from '@/assets/images/profile/avatar/user-5.jpg';
import user6 from '@/assets/images/profile/avatar/user-6.jpg';
import user7 from '@/assets/images/profile/avatar/user-7.jpg';
import user8 from '@/assets/images/profile/avatar/user-8.jpg';
import user9 from '@/assets/images/profile/avatar/user-9.jpg';
import user10 from '@/assets/images/profile/avatar/user-10.jpg';
import user11 from '@/assets/images/profile/avatar/user-11.jpg';
import user12 from '@/assets/images/profile/avatar/user-12.jpg';
import user13 from '@/assets/images/profile/avatar/user-13.jpg';
import user14 from '@/assets/images/profile/avatar/user-14.jpg';
import user15 from '@/assets/images/profile/avatar/user-15.jpg';

/** Préfixe des avatars catalogue (`/avatar/user-1`, …). */
export const AVATAR_CATALOG_PREFIX = '/avatar/';

/** Image affichée quand `profilePicture` est `null`. */
export const DEFAULT_AVATAR_SRC = user1;

/** Chemins catalogue (assets `src/assets/images/profile/avatar/user-*.jpg`). */
export const CATALOG_AVATARS = [
    '/avatar/user-1',
    '/avatar/user-2',
    '/avatar/user-3',
    '/avatar/user-4',
    '/avatar/user-5',
    '/avatar/user-6',
    '/avatar/user-7',
    '/avatar/user-8',
    '/avatar/user-9',
    '/avatar/user-10',
    '/avatar/user-11',
    '/avatar/user-12',
    '/avatar/user-13',
    '/avatar/user-14',
    '/avatar/user-15'
] as const;

export type CatalogAvatarPath = (typeof CATALOG_AVATARS)[number];

const CATALOG_SRC_BY_PATH: Record<string, string> = {
    '/avatar/user-1': user1,
    '/avatar/user-2': user2,
    '/avatar/user-3': user3,
    '/avatar/user-4': user4,
    '/avatar/user-5': user5,
    '/avatar/user-6': user6,
    '/avatar/user-7': user7,
    '/avatar/user-8': user8,
    '/avatar/user-9': user9,
    '/avatar/user-10': user10,
    '/avatar/user-11': user11,
    '/avatar/user-12': user12,
    '/avatar/user-13': user13,
    '/avatar/user-14': user14,
    '/avatar/user-15': user15,
    // Alias historiques éventuels côté API / tests
    '/avatar/guy1': user1,
    '/avatar/guy2': user2,
    '/avatar/guy3': user3,
    '/avatar/guy4': user4,
    '/avatar/guy5': user5
};

const UPLOADED_HASH_PATTERN = /^[a-f0-9]{64}$/;
const CATALOG_PATH_PATTERN = /^\/avatar\/[a-zA-Z0-9_-]{1,64}$/;

export function isUploadedProfilePicture(value: string | null | undefined): boolean {
    return !!value && UPLOADED_HASH_PATTERN.test(value);
}

export function isCatalogProfilePicture(value: string | null | undefined): boolean {
    return !!value && CATALOG_PATH_PATTERN.test(value);
}

/** URL front pour un avatar catalogue ; défaut si chemin inconnu. */
export function catalogAvatarSrc(path: string): string {
    return CATALOG_SRC_BY_PATH[path] ?? DEFAULT_AVATAR_SRC;
}
