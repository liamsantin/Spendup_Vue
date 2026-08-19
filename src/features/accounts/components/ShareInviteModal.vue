<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CircleCheckIcon } from 'vue-tabler-icons';
import type { PerfectScrollbarExpose } from 'vue3-perfect-scrollbar';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { FriendListItem, friendsApi } from '@/features/friends';
import type { FriendItem } from '@/features/friends';
import { getErrorMessage } from '@/utils/errors/app-error';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { useAccountsStore } from '../stores/accounts-store';
import type { ShareRole } from '../types';
import ShareRolePicker from './ShareRolePicker.vue';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const store = useAccountsStore();

const friends = ref<FriendItem[]>([]);
const loadingFriends = ref(false);
const friendQuery = ref('');
const selectedUserPublicId = ref<string | null>(null);
const role = ref<ShareRole>('viewer');
const localError = ref<string | null>(null);
const listScrollbarRef = ref<PerfectScrollbarExpose | null>(null);
const listScrollbarOptions = {
    ...PERFECT_SCROLLBAR_OPTIONS,
    wheelPropagation: false
};

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const excludedIds = computed(() => new Set(store.shares.map((s) => s.userPublicId)));

const availableFriends = computed(() => friends.value.filter((f) => f.user.publicId && !excludedIds.value.has(f.user.publicId)));

const filteredFriends = computed(() => {
    const query = friendQuery.value.trim().toLowerCase();
    if (!query) return availableFriends.value;
    return availableFriends.value.filter((f) => {
        const haystack = [f.user.firstName, f.user.name, f.user.username, f.user.publicId]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(query);
    });
});

async function loadFriends() {
    loadingFriends.value = true;
    localError.value = null;
    try {
        const result = await friendsApi.list(1, 100);
        friends.value = Array.isArray(result?.items) ? result.items : [];
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
        friends.value = [];
    } finally {
        loadingFriends.value = false;
    }
}

watch(
    () => props.modelValue,
    (value) => {
        if (value) {
            selectedUserPublicId.value = null;
            friendQuery.value = '';
            role.value = 'viewer';
            localError.value = null;
            void loadFriends();
        }
    }
);

watch(
    () => [props.modelValue, filteredFriends.value.length, loadingFriends.value] as const,
    async () => {
        if (!props.modelValue) return;
        await nextTick();
        listScrollbarRef.value?.ps?.update();
    }
);

function selectFriend(userPublicId: string) {
    selectedUserPublicId.value = userPublicId;
    localError.value = null;
}

async function onInvite() {
    if (!selectedUserPublicId.value) {
        localError.value = t('comptesPage.share.errors.friendRequired');
        return;
    }
    localError.value = null;
    try {
        const friend = availableFriends.value.find((f) => f.user.publicId === selectedUserPublicId.value);
        await store.inviteShare(
            props.accountPublicId,
            selectedUserPublicId.value,
            role.value,
            friend?.user.profilePicture ?? null
        );
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('comptesPage.share.inviteTitle')"
        :subtitle="t('comptesPage.share.inviteSubtitle')"
        :height="600"
        :max-width="520"
        fixed-height
        :scrollable="false"
    >
        <div class="share-invite">
            <AppAlert
                v-if="localError"
                color="error"
                variant="tonal"
                class="mb-4"
                closable
                :dismiss-ms="3000"
                @dismiss="localError = null"
            >
                {{ localError }}
            </AppAlert>

            <v-label class="font-weight-medium mb-2">{{ t('comptesPage.share.fields.friend') }}</v-label>
            <v-text-field
                v-model="friendQuery"
                :placeholder="t('comptesPage.share.searchFriend')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                color="primary"
                hide-details
                clearable
                :disabled="loadingFriends || !availableFriends.length"
                class="mb-2"
            />

            <div class="share-invite-list mb-4">
                <PerfectScrollbar ref="listScrollbarRef" class="share-invite-list__scroll" :options="listScrollbarOptions">
                    <div v-if="loadingFriends" class="share-invite-list__placeholder">
                        <v-progress-circular indeterminate color="primary" size="28" />
                    </div>
                    <div v-else-if="!availableFriends.length" class="share-invite-list__placeholder text-medium-emphasis text-body-2">
                        {{ t('comptesPage.share.emptyFriends') }}
                    </div>
                    <div v-else-if="!filteredFriends.length" class="share-invite-list__placeholder text-medium-emphasis text-body-2">
                        {{ t('comptesPage.share.noMatchingFriends') }}
                    </div>
                    <v-list v-else class="py-0 theme-list">
                        <FriendListItem
                            v-for="friend in filteredFriends"
                            :key="friend.user.publicId"
                            :user="friend.user"
                            :highlight="selectedUserPublicId === friend.user.publicId"
                            @click="selectFriend(friend.user.publicId)"
                        >
                            <template #actions>
                                <CircleCheckIcon
                                    v-if="selectedUserPublicId === friend.user.publicId"
                                    class="text-primary"
                                    :size="22"
                                    stroke-width="1.8"
                                />
                            </template>
                        </FriendListItem>
                    </v-list>
                </PerfectScrollbar>
            </div>

            <v-label class="font-weight-medium mb-2">{{ t('comptesPage.share.fields.role') }}</v-label>
            <ShareRolePicker v-model="role" />
        </div>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting || loadingFriends" @click="onInvite">
                {{ t('comptesPage.share.invite') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>

<style scoped>
.share-invite-list {
    height: 200px;
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 10px;
}

.share-invite-list__scroll {
    height: 200px;
    max-height: 200px;
}

.share-invite-list :deep(.ps) {
    height: 200px;
    max-height: 200px;
}

.share-invite-list__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    height: 200px;
    padding: 16px;
    text-align: center;
}
</style>
