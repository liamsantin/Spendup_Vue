import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useAuthStore } from '@/features/auth';
import { friendsApi } from '../api';
import { DEFAULT_AVATAR_SRC, needsUserAvatarFetch, resolveFriendAvatarSrc } from '../profilePicture';

type SharedBlobEntry = {
    url: string;
    refCount: number;
};

/** Cache blob partagé par `publicId:hash` (invalide si la photo change). */
const sharedBlobByKey = new Map<string, SharedBlobEntry>();
const sharedBlobInFlight = new Map<string, Promise<string>>();

function avatarCacheKey(publicId: string, hash: string): string {
    return `${publicId}:${hash}`;
}

function retainSharedBlob(key: string, url: string): string {
    const existing = sharedBlobByKey.get(key);
    if (existing) {
        existing.refCount += 1;
        if (existing.url !== url) {
            URL.revokeObjectURL(url);
        }
        return existing.url;
    }
    sharedBlobByKey.set(key, { url, refCount: 1 });
    return url;
}

function releaseSharedBlob(key: string | null) {
    if (!key) return;
    const entry = sharedBlobByKey.get(key);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        sharedBlobByKey.delete(key);
    }
}

/**
 * URL affichable pour un utilisateur friends (catalogue, chemin, ou blob hash via
 * `GET /api/users/{publicId}/avatar`).
 */
export function useFriendAvatarUrl(publicId: MaybeRefOrGetter<string>, profilePicture: MaybeRefOrGetter<string | null | undefined>) {
    const auth = useAuthStore();
    const avatarSrc = ref<string>(DEFAULT_AVATAR_SRC);
    const loading = ref(false);
    let heldKey: string | null = null;
    let requestId = 0;

    function releaseHeld() {
        releaseSharedBlob(heldKey);
        heldKey = null;
    }

    async function resolveUploaded(id: string, hash: string, request: number): Promise<void> {
        const key = avatarCacheKey(id, hash);
        loading.value = true;
        try {
            let urlPromise = sharedBlobInFlight.get(key);
            if (!urlPromise) {
                urlPromise = (async () => {
                    const cached = sharedBlobByKey.get(key);
                    if (cached) return cached.url;
                    const token = await auth.ensureAccessToken();
                    const blob = await friendsApi.getUserAvatarBlob(id, token);
                    const created = URL.createObjectURL(blob);
                    const existing = sharedBlobByKey.get(key);
                    if (existing) {
                        URL.revokeObjectURL(created);
                        return existing.url;
                    }
                    sharedBlobByKey.set(key, { url: created, refCount: 0 });
                    return created;
                })().finally(() => {
                    sharedBlobInFlight.delete(key);
                });
                sharedBlobInFlight.set(key, urlPromise);
            }

            const url = await urlPromise;
            if (request !== requestId) return;

            releaseHeld();
            heldKey = key;
            avatarSrc.value = retainSharedBlob(key, url);
        } catch {
            if (request !== requestId) return;
            releaseHeld();
            avatarSrc.value = DEFAULT_AVATAR_SRC;
        } finally {
            if (request === requestId) loading.value = false;
        }
    }

    async function resolve() {
        const request = ++requestId;
        const id = toValue(publicId)?.trim();
        const picture = toValue(profilePicture)?.trim() ?? null;

        if (!id) {
            releaseHeld();
            avatarSrc.value = DEFAULT_AVATAR_SRC;
            loading.value = false;
            return;
        }

        if (needsUserAvatarFetch(picture) && picture) {
            await resolveUploaded(id, picture, request);
            return;
        }

        const sync = resolveFriendAvatarSrc(picture);
        releaseHeld();
        avatarSrc.value = sync ?? DEFAULT_AVATAR_SRC;
        loading.value = false;
    }

    watch([() => toValue(publicId), () => toValue(profilePicture)], () => void resolve(), { immediate: true });

    onUnmounted(() => {
        requestId += 1;
        releaseHeld();
    });

    return { avatarSrc, loading };
}
