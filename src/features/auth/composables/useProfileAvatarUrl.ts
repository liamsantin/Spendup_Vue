import { onUnmounted, ref, watch } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { DEFAULT_AVATAR_SRC, catalogAvatarSrc, isCatalogProfilePicture, isUploadedProfilePicture } from '@/features/auth/profilePicture';

/**
 * URL affichable de la photo de profil courante (catalogue, blob upload, ou défaut).
 * Partagé header / sidebar / etc.
 */
export function useProfileAvatarUrl() {
    const auth = useAuthStore();
    const avatarSrc = ref<string>(DEFAULT_AVATAR_SRC);
    const loading = ref(false);
    let blobUrl: string | null = null;
    let requestId = 0;

    function revokeBlob() {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
        }
    }

    async function resolve(picture: string | null | undefined) {
        const id = ++requestId;
        revokeBlob();

        if (!picture) {
            avatarSrc.value = DEFAULT_AVATAR_SRC;
            loading.value = false;
            return;
        }

        if (isCatalogProfilePicture(picture)) {
            avatarSrc.value = catalogAvatarSrc(picture);
            loading.value = false;
            return;
        }

        if (isUploadedProfilePicture(picture)) {
            loading.value = true;
            try {
                const blob = await auth.fetchAvatarBlob();
                if (id !== requestId) return;
                blobUrl = URL.createObjectURL(blob);
                avatarSrc.value = blobUrl;
            } catch {
                if (id !== requestId) return;
                avatarSrc.value = DEFAULT_AVATAR_SRC;
            } finally {
                if (id === requestId) loading.value = false;
            }
            return;
        }

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
        revokeBlob();
    });

    return { avatarSrc, loading };
}
