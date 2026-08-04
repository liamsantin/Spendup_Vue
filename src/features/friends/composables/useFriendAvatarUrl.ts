import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useAuthStore } from '@/features/auth';
import { friendsApi } from '../api';
import { DEFAULT_AVATAR_SRC, needsUserAvatarFetch, resolveFriendAvatarSrc } from '../profilePicture';

type SharedBlobEntry = {
    url: string;
    refCount: number;
};

/** Cache blob partagé par `publicId` (listes amis / demandes / recherche). */
const sharedBlobByPublicId = new Map<string, SharedBlobEntry>();
const sharedBlobInFlight = new Map<string, Promise<string>>();

function retainSharedBlob(publicId: string, url: string): string {
    const existing = sharedBlobByPublicId.get(publicId);
    if (existing) {
        existing.refCount += 1;
        if (existing.url !== url) {
            URL.revokeObjectURL(url);
        }
        return existing.url;
    }
    sharedBlobByPublicId.set(publicId, { url, refCount: 1 });
    return url;
}

function releaseSharedBlob(publicId: string | null) {
    if (!publicId) return;
    const entry = sharedBlobByPublicId.get(publicId);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        sharedBlobByPublicId.delete(publicId);
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
    let heldPublicId: string | null = null;
    let requestId = 0;

    function releaseHeld() {
        releaseSharedBlob(heldPublicId);
        heldPublicId = null;
    }

    async function resolveUploaded(id: string, request: number): Promise<void> {
        loading.value = true;
        try {
            let urlPromise = sharedBlobInFlight.get(id);
            if (!urlPromise) {
                urlPromise = (async () => {
                    const cached = sharedBlobByPublicId.get(id);
                    if (cached) return cached.url;
                    const token = await auth.ensureAccessToken();
                    const blob = await friendsApi.getUserAvatarBlob(id, token);
                    const created = URL.createObjectURL(blob);
                    const existing = sharedBlobByPublicId.get(id);
                    if (existing) {
                        URL.revokeObjectURL(created);
                        return existing.url;
                    }
                    sharedBlobByPublicId.set(id, { url: created, refCount: 0 });
                    return created;
                })().finally(() => {
                    sharedBlobInFlight.delete(id);
                });
                sharedBlobInFlight.set(id, urlPromise);
            }

            const url = await urlPromise;
            if (request !== requestId) return;

            releaseHeld();
            heldPublicId = id;
            avatarSrc.value = retainSharedBlob(id, url);
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
        const picture = toValue(profilePicture);

        if (!id) {
            releaseHeld();
            avatarSrc.value = DEFAULT_AVATAR_SRC;
            loading.value = false;
            return;
        }

        if (needsUserAvatarFetch(picture)) {
            await resolveUploaded(id, request);
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
