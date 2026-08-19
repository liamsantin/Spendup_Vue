<script setup lang="ts">
/**
 * Champs d’invitation au partage (recherche, liste, rôle). Indépendant du shell modal.
 */
defineOptions({ name: 'ShareInviteForm' });

import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SearchIcon } from 'vue-tabler-icons';
import { useDisplay } from 'vuetify';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { useShareInvite } from '../../composables/useShareInvite';
import ShareInviteFriendList from '../list/ShareInviteFriendList.vue';
import ShareRolePicker from './ShareRolePicker.vue';

const props = defineProps<{
    accountPublicId: string;
    isOpen: boolean;
}>();

const emit = defineEmits<{
    close: [];
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();

const invite = useShareInvite({
    accountPublicId: () => props.accountPublicId,
    isOpen: () => props.isOpen,
    close: () => emit('close')
});

const listScrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const listScrollbarOptions = {
    ...PERFECT_SCROLLBAR_OPTIONS,
    wheelPropagation: false
};

watch(
    () => [props.isOpen, smAndDown.value, invite.filteredFriends.length, invite.loadingFriends] as const,
    async () => {
        if (!props.isOpen || smAndDown.value) return;
        await nextTick();
        listScrollbarRef.value?.ps?.update();
    }
);

defineExpose({
    submit: invite.submitInvite
});
</script>

<template>
    <div class="share-invite-form">
        <AppAlert
            v-if="invite.localError"
            color="error"
            variant="tonal"
            class="mb-4"
            closable
            :dismiss-ms="3000"
            @dismiss="invite.localError = null"
        >
            {{ invite.localError }}
        </AppAlert>

        <v-label class="font-weight-medium mb-2">{{ t('comptesPage.share.fields.friend') }}</v-label>
        <v-text-field
            v-model="invite.friendQuery"
            :placeholder="t('comptesPage.share.searchFriend')"
            variant="outlined"
            color="primary"
            hide-details
            clearable
            :disabled="invite.loadingFriends || !invite.availableFriends.length"
            class="mb-2"
        >
            <template #prepend-inner>
                <SearchIcon stroke-width="1.5" size="18" class="text-medium-emphasis" />
            </template>
        </v-text-field>

        <div class="share-invite-form__list">
            <div v-if="smAndDown" class="share-invite-form__list-scroll">
                <ShareInviteFriendList
                    :loading="invite.loadingFriends"
                    :has-available="invite.availableFriends.length > 0"
                    :friends="invite.filteredFriends"
                    :selected-user-public-id="invite.selectedUserPublicId"
                    @select="invite.selectFriend"
                />
            </div>
            <PerfectScrollbar v-else ref="listScrollbarRef" class="share-invite-form__list-scroll" :options="listScrollbarOptions">
                <ShareInviteFriendList
                    :loading="invite.loadingFriends"
                    :has-available="invite.availableFriends.length > 0"
                    :friends="invite.filteredFriends"
                    :selected-user-public-id="invite.selectedUserPublicId"
                    @select="invite.selectFriend"
                />
            </PerfectScrollbar>
        </div>

        <v-label class="font-weight-medium mb-2 mt-4">{{ t('comptesPage.share.fields.role') }}</v-label>
        <ShareRolePicker v-model="invite.role" />
    </div>
</template>

<style scoped>
.share-invite-form {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
}

.share-invite-form__list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 160px;
    height: 200px;
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 10px;
}

.share-invite-form__list-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    overflow: hidden;
}

@media (max-width: 599.98px) {
    .share-invite-form__list {
        height: 0;
        min-height: 180px;
    }

    .share-invite-form__list-scroll {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        touch-action: pan-y;
    }
}

.share-invite-form__list :deep(.ps) {
    height: 100%;
    max-height: 100%;
}
</style>
