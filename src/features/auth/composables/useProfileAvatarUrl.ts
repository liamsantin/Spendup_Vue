import { onUnmounted, ref, watch } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { DEFAULT_AVATAR_SRC, catalogAvatarSrc, isCatalogProfilePicture, isUploadedProfilePicture } from '@/features/auth/profilePicture';

type SharedBlobEntry = {
    url: string;
    refCount: number;
};

/** Cache blob partagé entre header / sidebar (évite des GET /avatar en double). */
const sharedBlobByHash = new Map<string, SharedBlobEntry>();
const sharedBlobInFlight = new Map<string, Promise<string>>();

function retainSharedBlob(hash: string, url: string): string {
    const existing = sharedBlobByHash.get(hash);
    if (existing) {
        existing.refCount += 1;
        if (existing.url !== url) {
            URL.revokeObjectURL(url);
        }
        return existing.url;
    }
    sharedBlobByHash.set(hash, { url, refCount: 1 });
    return url;
}

function releaseSharedBlob(hash: string | null) {
    if (!hash) return;
    const entry = sharedBlobByHash.get(hash);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.url);
        sharedBlobByHash.delete(hash);
    }
}

/**
 * URL affichable de la photo de profil courante (catalogue, blob upload, ou défaut).
 * Partagé header / sidebar / etc.
 */
export function useProfileAvatarUrl() {
    const auth = useAuthStore();
    const avatarSrc = ref<string>(DEFAULT_AVATAR_SRC);
    const loading = ref(false);
    let heldHash: string | null = null;
    let requestId = 0;

    function releaseHeld() {
        releaseSharedBlob(heldHash);
        heldHash = null;
    }

    async function resolveUploaded(hash: string, id: number): Promise<void> {
        loading.value = true;
        try {
            let urlPromise = sharedBlobInFlight.get(hash);
            if (!urlPromise) {
                urlPromise = (async () => {
                    const cached = sharedBlobByHash.get(hash);
                    if (cached) return cached.url;
                    const blob = await auth.fetchAvatarBlob();
                    const created = URL.createObjectURL(blob);
                    const existing = sharedBlobByHash.get(hash);
                    if (existing) {
                        URL.revokeObjectURL(created);
                        return existing.url;
                    }
                    // refCount 0 jusqu’au retain d’un composant (évite fuite si requête abandonnée).
                    sharedBlobByHash.set(hash, { url: created, refCount: 0 });
                    return created;
                })().finally(() => {
                    sharedBlobInFlight.delete(hash);
                });
                sharedBlobInFlight.set(hash, urlPromise);
            }

            const url = await urlPromise;
            if (id !== requestId) return;

            releaseHeld();
            heldHash = hash;
            avatarSrc.value = retainSharedBlob(hash, url);
        } catch {
            if (id !== requestId) return;
            releaseHeld();
            avatarSrc.value = DEFAULT_AVATAR_SRC;
        } finally {
            if (id === requestId) loading.value = false;
        }
    }

    async function resolve(picture: string | null | undefined) {
        const id = ++requestId;

        if (!picture) {
            releaseHeld();
            avatarSrc.value = DEFAULT_AVATAR_SRC;
            loading.value = false;
            return;
        }

        if (isCatalogProfilePicture(picture)) {
            releaseHeld();
            avatarSrc.value = catalogAvatarSrc(picture);
            loading.value = false;
            return;
        }

        if (isUploadedProfilePicture(picture)) {
            // Conserve l’URL précédente jusqu’au blob (évite flash image cassée).
            await resolveUploaded(picture, id);
            return;
        }

        releaseHeld();
        avatarSrc.value = DEFAULT_AVATAR_SRC;
        loading.value = false;
    }

    watch(
        () => auth.user?.profilePicture ?? null,
        (picture) => {
            void resolve(picture);
        },
        { immediate: true }
    );

    onUnmounted(() => {
        requestId += 1;
        releaseHeld();
    });

    return { avatarSrc, loading };
}
