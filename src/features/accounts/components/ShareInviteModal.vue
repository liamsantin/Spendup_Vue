<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import { friendsApi } from '@/features/friends';
import type { FriendItem } from '@/features/friends';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '../stores/accounts-store';
import type { ShareRole } from '../types';

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
const selectedUserPublicId = ref<string | null>(null);
const role = ref<ShareRole>('viewer');
const localError = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const excludedIds = computed(() => new Set(store.shares.map((s) => s.userPublicId)));

const availableFriends = computed(() => friends.value.filter((f) => f.user.publicId && !excludedIds.value.has(f.user.publicId)));

const friendItems = computed(() =>
    availableFriends.value.map((f) => {
        const fullName = [f.user.firstName, f.user.name].filter(Boolean).join(' ').trim();
        return {
            title: fullName || f.user.username || f.user.publicId,
            value: f.user.publicId,
            subtitle: f.user.username
        };
    })
);

const roleItems = computed(() => [
    { title: t('comptesPage.roles.viewer'), value: 'viewer' as ShareRole },
    { title: t('comptesPage.roles.editor'), value: 'editor' as ShareRole }
]);

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
            role.value = 'viewer';
            localError.value = null;
            void loadFriends();
        }
    }
);

async function onInvite() {
    if (!selectedUserPublicId.value) {
        localError.value = t('comptesPage.share.errors.friendRequired');
        return;
    }
    localError.value = null;
    try {
        await store.inviteShare(props.accountPublicId, selectedUserPublicId.value, role.value);
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
        :height="480"
        :max-width="480"
        :scrollable="false"
    >
        <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
            {{ localError }}
        </AppAlert>

        <div v-if="loadingFriends" class="py-6 text-center">
            <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <template v-else>
            <v-select
                v-model="selectedUserPublicId"
                :items="friendItems"
                :label="t('comptesPage.share.fields.friend')"
                variant="outlined"
                hide-details="auto"
                class="mb-4"
                :no-data-text="t('comptesPage.share.emptyFriends')"
            />
            <v-select
                v-model="role"
                :items="roleItems"
                :label="t('comptesPage.share.fields.role')"
                variant="outlined"
                hide-details="auto"
            />
        </template>

        <template #footer>
            <v-spacer />
            <v-btn variant="text" :disabled="store.acting" @click="open = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" :loading="store.acting" :disabled="store.acting || loadingFriends" @click="onInvite">
                {{ t('comptesPage.share.invite') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
