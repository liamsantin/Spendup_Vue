<script setup lang="ts">
import { computed } from 'vue';
import { useFriendAvatarUrl } from '@/features/friends/composables/useFriendAvatarUrl';

const props = defineProps<{
    photoUrl?: string | null;
    /** Requis pour résoudre un hash uploadé (même logique que `useFriendAvatarUrl`). */
    userPublicId?: string | null;
    fallbackLabel?: string;
    size?: number | string;
    /** Passe `start` au `v-avatar` (ex. dans un AppChip). */
    start?: boolean;
}>();

const sizePx = computed(() => Number(props.size ?? 48));

const { avatarSrc } = useFriendAvatarUrl(
    () => props.userPublicId ?? '',
    () => props.photoUrl
);
</script>

<template>
    <v-avatar :size="sizePx" color="lightprimary" :start="start">
        <v-img :src="avatarSrc" :width="sizePx" :height="sizePx" cover eager :alt="fallbackLabel || 'avatar'" />
    </v-avatar>
</template>
