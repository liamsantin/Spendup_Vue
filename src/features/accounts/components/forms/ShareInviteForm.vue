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
import { useShareInvite } from '@/features/accounts/composables/useShareInvite';
import ShareInviteFriendList from '@/features/accounts/components/list/ShareInviteFriendList.vue';
import ShareRolePicker from '@/features/accounts/components/forms/ShareRolePicker.vue';
import ShareHiddenFieldsPicker from '@/features/accounts/components/forms/ShareHiddenFieldsPicker.vue';

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
const optionsScrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const listScrollbarOptions = {
    ...PERFECT_SCROLLBAR_OPTIONS,
    wheelPropagation: false
};

watch(
    () =>
        [
            props.isOpen,
            smAndDown.value,
            invite.filteredFriends.length,
            invite.loadingFriends,
            invite.role,
            invite.hiddenFields.length
        ] as const,
    async () => {
        if (!props.isOpen || smAndDown.value) return;
        await nextTick();
        listScrollbarRef.value?.ps?.update();
        optionsScrollbarRef.value?.ps?.update();
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
            class="share-invite-form__alert"
            closable
            :dismiss-ms="3000"
            @dismiss="invite.localError = null"
        >
            {{ invite.localError }}
        </AppAlert>

        <div class="share-invite-form__friends">
            <label class="share-invite-form__label" for="share-invite-friend-search">
                {{ t('comptesPage.share.fields.friend') }}
            </label>
            <v-text-field
                id="share-invite-friend-search"
                v-model="invite.friendQuery"
                :placeholder="t('comptesPage.share.searchFriend')"
                :aria-label="t('comptesPage.share.searchFriend')"
                variant="outlined"
                color="primary"
                hide-details
                clearable
                :disabled="invite.loadingFriends || !invite.availableFriends.length"
                class="share-invite-form__search"
            >
                <template #prepend-inner>
                    <SearchIcon stroke-width="1.5" size="18" class="text-medium-emphasis" aria-hidden="true" />
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
        </div>

        <div class="share-invite-form__options">
            <PerfectScrollbar
                v-if="!smAndDown"
                ref="optionsScrollbarRef"
                class="share-invite-form__options-scroll"
                :options="listScrollbarOptions"
            >
                <div class="share-invite-form__role">
                    <div class="share-invite-form__label">{{ t('comptesPage.share.fields.role') }}</div>
                    <ShareRolePicker v-model="invite.role" />
                </div>

                <div v-if="invite.role === 'viewer'" class="share-invite-form__hidden">
                    <div class="share-invite-form__label">{{ t('comptesPage.share.fields.hiddenFields') }}</div>
                    <ShareHiddenFieldsPicker v-model="invite.hiddenFields" />
                </div>
            </PerfectScrollbar>
            <div v-else class="share-invite-form__options-scroll">
                <div class="share-invite-form__role">
                    <div class="share-invite-form__label">{{ t('comptesPage.share.fields.role') }}</div>
                    <ShareRolePicker v-model="invite.role" />
                </div>

                <div v-if="invite.role === 'viewer'" class="share-invite-form__hidden">
                    <div class="share-invite-form__label">{{ t('comptesPage.share.fields.hiddenFields') }}</div>
                    <ShareHiddenFieldsPicker v-model="invite.hiddenFields" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.share-invite-form {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    gap: 0;
}

.share-invite-form__alert {
    flex-shrink: 0;
    margin-bottom: 12px;
}

.share-invite-form__label {
    flex-shrink: 0;
    margin-bottom: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.35;
}

.share-invite-form__friends {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 240px;
    overflow: hidden;
}

.share-invite-form__search {
    flex: 0 0 auto;
    margin-bottom: 8px;
}

.share-invite-form__list {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 10px;
}

.share-invite-form__list-scroll {
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
}

.share-invite-form__options {
    position: relative;
    z-index: 1;
    flex: 0 1 auto;
    max-height: 180px;
    min-height: 0;
    margin-top: 16px;
    overflow: hidden;
    background: rgb(var(--v-theme-surface));
}

.share-invite-form__options-scroll {
    max-height: 180px;
    overflow: hidden;
}

.share-invite-form__role {
    padding-bottom: 2px;
}

.share-invite-form__hidden {
    margin-top: 16px;
    padding-bottom: 2px;
}

@media (max-width: 599.98px) {
    .share-invite-form__friends {
        min-height: 180px;
    }

    .share-invite-form__list-scroll,
    .share-invite-form__options-scroll {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        touch-action: pan-y;
    }
}

.share-invite-form__list :deep(.ps) {
    height: 100% !important;
    max-height: 100%;
}

.share-invite-form__options :deep(.ps) {
    max-height: 180px;
}
</style>
