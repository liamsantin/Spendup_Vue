import { computed, onUnmounted, reactive, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    DEFAULT_AVATAR_SRC,
    catalogAvatarSrc,
    isCatalogProfilePicture,
    isUploadedProfilePicture,
    useAuthStore
} from '@/features/auth';
import { getErrorMessage } from '@/utils/errors/app-error';

export function useAccountAvatarEditor(profilePicture: Ref<string | null>) {
    const auth = useAuthStore();
    const { t } = useI18n();

    const pictureSaving = ref(false);
    const pictureError = ref<string | null>(null);
    const avatarOpen = ref(false);
    const avatarDraft = ref<string | null>(null);
    const pictureLightboxOpen = ref(false);
    const avatarDisplaySrc = ref<string | null>(DEFAULT_AVATAR_SRC);

    let avatarDisplayRequestId = 0;

    const avatarSrc = computed(() => avatarDisplaySrc.value || undefined);

    function revokeDisplayBlob() {
        if (avatarDisplaySrc.value?.startsWith('blob:')) {
            URL.revokeObjectURL(avatarDisplaySrc.value);
        }
    }

    async function resolveAvatarDisplay(picture: string | null) {
        const id = ++avatarDisplayRequestId;
        pictureError.value = null;

        if (!picture) {
            revokeDisplayBlob();
            avatarDisplaySrc.value = DEFAULT_AVATAR_SRC;
            return;
        }

        if (isCatalogProfilePicture(picture)) {
            revokeDisplayBlob();
            avatarDisplaySrc.value = catalogAvatarSrc(picture);
            return;
        }

        if (isUploadedProfilePicture(picture)) {
            try {
                const blob = await auth.fetchAvatarBlob();
                if (id !== avatarDisplayRequestId) return;
                const nextUrl = URL.createObjectURL(blob);
                revokeDisplayBlob();
                avatarDisplaySrc.value = nextUrl;
            } catch (e: unknown) {
                if (id !== avatarDisplayRequestId) return;
                pictureError.value = getErrorMessage(e);
                revokeDisplayBlob();
                avatarDisplaySrc.value = DEFAULT_AVATAR_SRC;
            }
            return;
        }

        revokeDisplayBlob();
        avatarDisplaySrc.value = DEFAULT_AVATAR_SRC;
    }

    function openAvatarPicker() {
        pictureError.value = null;
        avatarDraft.value = isCatalogProfilePicture(profilePicture.value) ? profilePicture.value : null;
        avatarOpen.value = true;
    }

    function openPictureLightbox() {
        pictureLightboxOpen.value = true;
    }

    async function onPictureSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || pictureSaving.value) return;

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            pictureError.value = t('accounts.picture.errors.allowedFormats');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            pictureError.value = t('accounts.picture.errors.maxSize');
            return;
        }

        pictureSaving.value = true;
        pictureError.value = null;
        try {
            await auth.uploadAvatar(file);
            profilePicture.value = auth.user?.profilePicture ?? null;
            await resolveAvatarDisplay(profilePicture.value);
        } catch (e: unknown) {
            pictureError.value = getErrorMessage(e);
        } finally {
            pictureSaving.value = false;
        }
    }

    async function resetPicture() {
        if (pictureSaving.value) return;
        pictureSaving.value = true;
        pictureError.value = null;
        try {
            await auth.deleteAvatar();
            profilePicture.value = null;
            await resolveAvatarDisplay(null);
        } catch (e: unknown) {
            pictureError.value = getErrorMessage(e);
        } finally {
            pictureSaving.value = false;
        }
    }

    async function confirmCatalogAvatar() {
        if (pictureSaving.value || !avatarDraft.value) return;
        pictureSaving.value = true;
        pictureError.value = null;
        try {
            await auth.setCatalogAvatar(avatarDraft.value);
            profilePicture.value = auth.user?.profilePicture ?? avatarDraft.value;
            await resolveAvatarDisplay(profilePicture.value);
            avatarOpen.value = false;
        } catch (e: unknown) {
            pictureError.value = getErrorMessage(e);
        } finally {
            pictureSaving.value = false;
        }
    }

    onUnmounted(() => {
        avatarDisplayRequestId += 1;
        revokeDisplayBlob();
    });

    return reactive({
        pictureSaving,
        pictureError,
        avatarOpen,
        avatarDraft,
        pictureLightboxOpen,
        avatarSrc,
        resolveAvatarDisplay,
        openAvatarPicker,
        openPictureLightbox,
        onPictureSelected,
        resetPicture,
        confirmCatalogAvatar
    });
}
