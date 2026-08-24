<script setup lang="ts">
import { computed } from 'vue';
import { useFriendAvatarUrl } from '@/features/friends/composables/useFriendAvatarUrl';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import type { FriendUser } from '@/features/friends/types';

const props = defineProps<{
    user: FriendUser;
    friendshipPublicId?: string | null;
    subtitle?: string | null;
    highlight?: boolean;
}>();

const store = useFriendsStore();
const fullName = computed(() => [props.user.firstName, props.user.name].filter(Boolean).join(' ').trim());
const title = computed(() => fullName.value || props.user.username || props.user.publicId);
const focused = computed(
    () => props.highlight === true || (!!props.friendshipPublicId && store.isFocusedFriendship(props.friendshipPublicId))
);

const { avatarSrc } = useFriendAvatarUrl(
    () => props.user.publicId,
    () => props.user.profilePicture
);
</script>

<template>
    <!-- `link` active le hover Vuetify (comme les items notifications cliquables). -->
    <v-list-item
        link
        color="primary"
        class="friend-list-item px-2 py-3"
        rounded="md"
        :data-friendship-id="friendshipPublicId || undefined"
        :class="{ 'bg-lightprimary': focused }"
        @click.prevent
    >
        <template #prepend>
            <v-avatar size="46" class="mr-3" color="lightprimary">
                <v-img :src="avatarSrc" width="46" height="46" cover eager :alt="title" />
            </v-avatar>
        </template>

        <div class="d-flex align-start justify-space-between ga-2 w-100">
            <div class="min-width-0">
                <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ title }}</h6>
                <p class="text-body-2 text-medium-emphasis mb-0 text-truncate">
                    {{ subtitle || user.username || user.publicId }}
                </p>
            </div>
            <div class="d-flex flex-wrap justify-end ga-2 friend-list-item__actions" @click.stop>
                <slot name="actions" />
            </div>
        </div>
    </v-list-item>
</template>

<style scoped>
.friend-list-item__actions {
    position: relative;
    z-index: 2;
}
</style>
