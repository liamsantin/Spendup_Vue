<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CircleCheckIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { FriendListItem, friendsApi } from '@/features/friends';
import type { FriendItem } from '@/features/friends';
import { getErrorMessage } from '@/utils/errors/app-error';
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
        :height="560"
        :max-width="520"
        scrollable
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div v-if="loadingFriends" class="py-6 text-center">
            <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <template v-else>
            <v-label class="font-weight-medium mb-2">{{ t('comptesPage.share.fields.friend') }}</v-label>
            <v-text-field
                v-if="availableFriends.length"
                v-model="friendQuery"
                :placeholder="t('comptesPage.share.searchFriend')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                color="primary"
                hide-details
                clearable
                class="mb-2"
            />

            <div v-if="!availableFriends.length" class="share-invite-empty text-medium-emphasis text-body-2">
                {{ t('comptesPage.share.emptyFriends') }}
            </div>
            <div v-else-if="!filteredFriends.length" class="share-invite-empty text-medium-emphasis text-body-2">
                {{ t('comptesPage.share.noMatchingFriends') }}
            </div>
            <v-list v-else class="share-invite-list py-0 theme-list mb-4">
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

            <v-label class="font-weight-medium mb-2">{{ t('comptesPage.share.fields.role') }}</v-label>
            <ShareRolePicker v-model="role" />
        </template>

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
    max-height: 220px;
    overflow-y: auto;
}

.share-invite-empty {
    padding: 20px 8px;
    margin-bottom: 16px;
    text-align: center;
}
</style>
