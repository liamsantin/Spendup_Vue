<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { getFriendDisplayNameFromItem } from '@/features/friends/display-name';
import { FRIEND_NICKNAME_MAX_LENGTH, normalizeFriendNickname, validateFriendNickname } from '@/features/friends/nickname';
import { useFriendsStore } from '@/features/friends/stores/friends-store';
import type { FriendItem } from '@/features/friends/types';

const props = defineProps<{
    modelValue: boolean;
    friend: FriendItem | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const store = useFriendsStore();

const draft = ref('');
const fieldError = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const displayName = computed(() => (props.friend ? getFriendDisplayNameFromItem(props.friend) : ''));
const hasNickname = computed(() => !!props.friend?.nickname?.trim());

watch(
    () => [props.modelValue, props.friend?.friendshipPublicId, props.friend?.nickname] as const,
    ([isOpen]) => {
        if (!isOpen) {
            draft.value = '';
            fieldError.value = null;
            return;
        }
        draft.value = props.friend?.nickname ?? '';
        fieldError.value = null;
    },
    { immediate: true }
);

function validateBeforeSave(nickname: string | null): boolean {
    fieldError.value = null;
    try {
        validateFriendNickname(nickname);
        return true;
    } catch (e: unknown) {
        fieldError.value = e instanceof Error ? e.message : String(e);
        return false;
    }
}

async function saveNickname() {
    const friendshipPublicId = props.friend?.friendshipPublicId;
    if (!friendshipPublicId) return;
    const nickname = normalizeFriendNickname(draft.value);
    if (!validateBeforeSave(nickname)) return;
    try {
        await store.updateNickname(friendshipPublicId, draft.value);
        open.value = false;
    } catch {
        // erreur via store.error
    }
}

async function removeNickname() {
    const friendshipPublicId = props.friend?.friendshipPublicId;
    if (!friendshipPublicId) return;
    try {
        await store.updateNickname(friendshipPublicId, null);
        open.value = false;
    } catch {
        // erreur via store.error
    }
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t('friendsPage.nicknameModal.title')"
        :subtitle="t('friendsPage.nicknameModal.subtitle', { name: displayName })"
        :max-width="480"
        :scrollable="false"
    >
        <p class="text-body-2 text-medium-emphasis mb-4">
            {{ t('friendsPage.nicknameModal.hint') }}
        </p>

        <v-text-field
            v-model="draft"
            :label="t('friendsPage.nicknameModal.label')"
            :placeholder="t('friendsPage.nicknameModal.placeholder')"
            variant="outlined"
            hide-details="auto"
            :maxlength="FRIEND_NICKNAME_MAX_LENGTH"
            counter
            :error-messages="fieldError ? [fieldError] : []"
            @keyup.enter="saveNickname"
        />

        <template #footer="{ close }">
            <button v-if="hasNickname" type="button" class="su-btn su-btn--danger" :disabled="store.acting" @click="removeNickname">
                {{ t('friendsPage.nicknameModal.remove') }}
            </button>
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="saveNickname">
                {{ t('friendsPage.nicknameModal.save') }}
            </button>
        </template>
    </AppModalBase>
</template>
