<script setup lang="ts">
import { computed } from 'vue';
import { useFriendAvatarUrl } from '../composables/useFriendAvatarUrl';
import type { FriendUser } from '../types';

const props = defineProps<{
    user: FriendUser;
    subtitle?: string | null;
    highlight?: boolean;
}>();

const fullName = computed(() => [props.user.firstName, props.user.name].filter(Boolean).join(' ').trim());
const title = computed(() => fullName.value || props.user.username || props.user.publicId);

const { avatarSrc } = useFriendAvatarUrl(
    () => props.user.publicId,
    () => props.user.profilePicture
);
</script>

<template>
    <v-list-item class="px-2 py-3" rounded="md" :class="{ 'bg-lightprimary': highlight }">
        <template #prepend>
            <v-avatar size="46" class="mr-3" color="lightprimary">
                <v-img :src="avatarSrc" width="46" height="46" cover :alt="title" />
            </v-avatar>
        </template>

        <div class="d-flex align-start justify-space-between ga-2 w-100">
            <div class="min-width-0">
                <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ title }}</h6>
                <p class="text-body-2 text-medium-emphasis mb-0 text-truncate">
                    {{ subtitle || user.username || user.publicId }}
                </p>
            </div>
            <div class="d-flex flex-wrap justify-end ga-2">
                <slot name="actions" />
            </div>
        </div>
    </v-list-item>
</template>
