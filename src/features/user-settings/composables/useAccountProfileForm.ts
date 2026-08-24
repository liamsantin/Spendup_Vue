import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore, type Me, type UpdateProfilePayload } from '@/features/auth';
import { getErrorMessage } from '@/utils/errors/app-error';
import {
    buildProfilePayload as buildPayloadFromFields,
    isProfileDirty,
    takeProfileSnapshot,
    type ProfileSnapshot
} from '../account-profile';

export type AccountProfileFields = {
    firstName: Ref<string>;
    name: Ref<string>;
    phone: Ref<string>;
    birthDate: Ref<string>;
    street: Ref<string>;
    streetNumber: Ref<string>;
    countryId: Ref<number | null>;
    username: Ref<string>;
    profilePicture: Ref<string | null>;
};

export function useAccountProfileForm(options: {
    fields: AccountProfileFields;
    onHydratePicture: (picture: string | null) => void;
    emitDirty: (value: boolean) => void;
    clearAccountFeedback: () => void;
    onMountedExtra?: () => void;
}) {
    const auth = useAuthStore();
    const { t } = useI18n();

    const loading = ref(false);
    const profileSaving = ref(false);
    const profileError = ref<string | null>(null);
    const cancelConfirmOpen = ref(false);
    const cancelConfirming = ref(false);
    const saveConfirmOpen = ref(false);
    const baseline = ref<ProfileSnapshot | null>(null);

    const {
        firstName,
        name,
        phone,
        birthDate,
        street,
        streetNumber,
        countryId,
        username,
        profilePicture
    } = options.fields;

    const displayPublicId = computed(() => auth.user?.userPublicId || '—');
    const birthDateMax = computed(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });

    function profileFields() {
        return {
            firstName: firstName.value,
            name: name.value,
            phone: phone.value,
            birthDate: birthDate.value,
            street: street.value,
            streetNumber: streetNumber.value,
            countryId: countryId.value
        };
    }

    function buildProfilePayload(): UpdateProfilePayload {
        return buildPayloadFromFields(profileFields());
    }

    function takeSnapshot(): ProfileSnapshot {
        return takeProfileSnapshot(profileFields());
    }

    function commitBaseline() {
        baseline.value = takeSnapshot();
    }

    const isDirty = computed(() => isProfileDirty(takeSnapshot(), baseline.value));

    watch(isDirty, (value) => options.emitDirty(value), { immediate: true });

    function hydrateFromUser(user: Me | null) {
        if (!user) {
            firstName.value = '';
            name.value = '';
            phone.value = '';
            birthDate.value = '';
            street.value = '';
            streetNumber.value = '';
            profilePicture.value = null;
            countryId.value = null;
            username.value = '';
            options.onHydratePicture(null);
            return;
        }

        firstName.value = user.firstName ?? '';
        name.value = user.name ?? '';
        phone.value = user.phone ?? '';
        birthDate.value = user.birthDate ?? '';
        street.value = user.street ?? '';
        streetNumber.value = user.streetNumber ?? '';
        profilePicture.value = user.profilePicture ?? null;
        countryId.value = user.countryId ?? null;
        username.value = user.username ?? '';
        options.onHydratePicture(profilePicture.value);
    }

    async function copyPublicId() {
        const id = auth.user?.userPublicId;
        if (!id) return;
        try {
            await navigator.clipboard.writeText(id);
        } catch {
            profileError.value = t('accounts.personal.errors.copyPublicId');
        }
    }

    async function loadProfile() {
        loading.value = true;
        profileError.value = null;
        try {
            if (auth.user && !baseline.value) {
                hydrateFromUser(auth.user);
                commitBaseline();
            }
            const user = await auth.fetchMe();
            hydrateFromUser(user);
            commitBaseline();
        } catch (e: unknown) {
            profileError.value = getErrorMessage(e);
        } finally {
            loading.value = false;
        }
    }

    async function saveProfile() {
        if (profileSaving.value || !isDirty.value) return;
        profileSaving.value = true;
        profileError.value = null;
        try {
            await auth.updateProfile(buildProfilePayload());
            hydrateFromUser(auth.user);
            commitBaseline();
        } catch (e: unknown) {
            profileError.value = getErrorMessage(e);
            throw e;
        } finally {
            profileSaving.value = false;
        }
    }

    function requestSaveProfile() {
        if (!isDirty.value || profileSaving.value) return;
        saveConfirmOpen.value = true;
    }

    async function confirmSaveProfile() {
        if (profileSaving.value) return;
        try {
            await saveProfile();
            saveConfirmOpen.value = false;
        } catch {
            // Erreur déjà affichée dans le formulaire
        }
    }

    async function resetProfile() {
        profileError.value = null;
        options.clearAccountFeedback();
        await loadProfile();
    }

    function requestResetProfile() {
        if (!isDirty.value || cancelConfirming.value) return;
        cancelConfirmOpen.value = true;
    }

    async function confirmResetProfile() {
        if (cancelConfirming.value) return;
        cancelConfirming.value = true;
        try {
            await resetProfile();
            cancelConfirmOpen.value = false;
        } finally {
            cancelConfirming.value = false;
        }
    }

    onMounted(() => {
        void loadProfile();
        options.onMountedExtra?.();
    });

    return reactive({
        loading,
        profileSaving,
        profileError,
        baseline,
        isDirty,
        displayPublicId,
        birthDateMax,
        cancelConfirmOpen,
        cancelConfirming,
        saveConfirmOpen,
        hydrateFromUser,
        copyPublicId,
        requestSaveProfile,
        confirmSaveProfile,
        requestResetProfile,
        confirmResetProfile
    });
}
