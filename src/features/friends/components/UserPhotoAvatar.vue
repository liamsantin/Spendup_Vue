<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useAuthStore } from '@/features/auth';
import { catalogAvatarSrc, isCatalogProfilePicture, isUploadedProfilePicture } from '@/features/auth/profilePicture';
import { friendsApi } from '../api';
import { extractPublicIdFromUserAvatarPath } from '../profilePicture';
import { getApiBaseUrl } from '@/utils/helpers/axios-helpers';

const props = defineProps<{
    photoUrl?: string | null;
    /** Requis pour résoudre un hash uploadé (même logique que `useFriendAvatarUrl`). */
    userPublicId?: string | null;
    fallbackLabel?: string;
    size?: number | string;
    /** Passe `start` au `v-avatar` (ex. dans un AppChip). */
    start?: boolean;
}>();

const auth = useAuthStore();
const avatarSrc = ref<string | null>(null);
const loading = ref(false);
let heldUrl: string | null = null;
let requestId = 0;

function revokeHeld() {
    if (heldUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(heldUrl);
    }
    heldUrl = null;
}

async function fetchAvatarBlob(publicId: string, request: number) {
    loading.value = true;
    try {
        const token = await auth.ensureAccessToken();
        const blob = await friendsApi.getUserAvatarBlob(publicId, token);
        if (request !== requestId) return;
        const url = URL.createObjectURL(blob);
        heldUrl = url;
        avatarSrc.value = url;
    } catch {
        if (request !== requestId) return;
        avatarSrc.value = null;
    } finally {
        if (request === requestId) loading.value = false;
    }
}

async function resolve(photoUrl: string | null | undefined, userPublicId: string | null | undefined) {
    const request = ++requestId;
    revokeHeld();
    avatarSrc.value = null;

    const value = photoUrl?.trim();
    const id = userPublicId?.trim() || '';

    if (!value) {
        loading.value = false;
        return;
    }

    if (isCatalogProfilePicture(value)) {
        avatarSrc.value = catalogAvatarSrc(value);
        loading.value = false;
        return;
    }

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
        avatarSrc.value = value;
        loading.value = false;
        return;
    }

    if (isUploadedProfilePicture(value) && id) {
        await fetchAvatarBlob(id, request);
        return;
    }

    const pathPublicId = extractPublicIdFromUserAvatarPath(value);
    if (pathPublicId) {
        await fetchAvatarBlob(pathPublicId, request);
        return;
    }

    if (value.startsWith('/')) {
        avatarSrc.value = `${getApiBaseUrl()}${value}`;
        loading.value = false;
        return;
    }

    avatarSrc.value = null;
    loading.value = false;
}

watch(
    () => [props.photoUrl, props.userPublicId] as const,
    ([photoUrl, userPublicId]) => void resolve(photoUrl, userPublicId),
    { immediate: true }
);

onUnmounted(() => {
    requestId += 1;
    revokeHeld();
});

const sizePx = computed(() => Number(props.size ?? 48));
const showFallback = computed(() => !avatarSrc.value && !loading.value);
const initial = computed(() => (props.fallbackLabel?.trim().charAt(0) || '?').toUpperCase());
</script>

<template>
    <v-avatar :size="sizePx" color="lightprimary" :start="start">
        <v-img v-if="avatarSrc" :src="avatarSrc" :width="sizePx" :height="sizePx" cover :alt="fallbackLabel || 'avatar'" />
        <span v-else-if="showFallback" class="text-h6 text-primary">{{ initial }}</span>
    </v-avatar>
</template>
