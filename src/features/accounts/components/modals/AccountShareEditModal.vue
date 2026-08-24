<script setup lang="ts">
defineOptions({ name: 'AccountShareEditModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { UserPhotoAvatar } from '@/features/friends';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { AccountShare, ShareRole } from '@/features/accounts/types';
import ShareRolePicker from '@/features/accounts/components/forms/ShareRolePicker.vue';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string;
    share: AccountShare | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    revoke: [share: AccountShare];
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();
const editRole = ref<ShareRole>('viewer');
const editError = ref<string | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

watch(
    () => [props.modelValue, props.share?.publicId] as const,
    () => {
        if (!props.modelValue || !props.share) return;
        editRole.value = (props.share.role === 'pending' ? (props.share.invitedRole ?? 'viewer') : props.share.role) as ShareRole;
        editError.value = null;
    }
);

async function confirmEdit() {
    if (!props.share) return;
    if (props.share.role === 'pending' || props.share.role === editRole.value) {
        open.value = false;
        return;
    }
    editError.value = null;
    try {
        await store.updateShareRole(props.accountPublicId, props.share.userPublicId, editRole.value);
        open.value = false;
    } catch (e: unknown) {
        editError.value = getErrorMessage(e);
    }
}

function requestRevoke() {
    if (!props.share) return;
    emit('revoke', props.share);
    open.value = false;
}
</script>

<template>
    <AppModalBase v-model="open" :title="t('comptesPage.share.editTitle')" :max-width="420" :scrollable="false" mobile-layout="sheet">
        <div v-if="share" class="d-flex align-center ga-3 mb-5">
            <UserPhotoAvatar
                :photo-url="share.photoUrl"
                :user-public-id="share.userPublicId"
                :fallback-label="share.displayName"
                :size="42"
            />
            <div class="min-width-0">
                <div class="text-subtitle-1 font-weight-bold text-truncate">{{ share.displayName }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ formatDate(share.createdAt) }}</div>
            </div>
        </div>

        <AppAlert v-if="editError" color="error" variant="tonal" class="mb-4" closable :dismiss-ms="3000" @dismiss="editError = null">
            {{ editError }}
        </AppAlert>

        <div class="mb-4">
            <div class="text-subtitle-2 mb-2">{{ t('comptesPage.share.fields.role') }}</div>
            <ShareRolePicker v-model="editRole" :disabled="store.acting || share?.role === 'pending'" />
        </div>

        <v-btn variant="tonal" color="error" size="small" :disabled="store.acting" @click="requestRevoke">
            {{ share?.role === 'pending' ? t('comptesPage.share.cancelInvite') : t('comptesPage.share.revoke') }}
        </v-btn>

        <template #footer="{ close }">
            <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-spacer />
            <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting || share?.role === 'pending'" @click="confirmEdit">
                {{ t('comptesPage.share.editConfirm') }}
            </v-btn>
        </template>
    </AppModalBase>
</template>
