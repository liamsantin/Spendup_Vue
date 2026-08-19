<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { UserPhotoAvatar } from '@/features/friends';
import { PencilIcon } from 'vue-tabler-icons';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '../stores/accounts-store';
import type { AccountShare, ShareRole } from '../types';
import ShareInviteModal from './ShareInviteModal.vue';
import ShareRolePicker from './ShareRolePicker.vue';

const props = defineProps<{
    accountPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const inviteOpen = ref(false);
const editTargetId = ref<string | null>(null);
const editRole = ref<ShareRole>('viewer');
const revokeTarget = ref<AccountShare | null>(null);
const localError = ref<string | null>(null);
const editError = ref<string | null>(null);

/** Toujours synchronisé avec le store — reflète les mises à jour de photoUrl, displayName, role. */
const editTarget = computed(() =>
    editTargetId.value ? (store.shares.find((s) => s.publicId === editTargetId.value) ?? null) : null
);

const editOpen = computed({
    get: () => !!editTargetId.value,
    set: (value: boolean) => {
        if (!value) {
            editTargetId.value = null;
            editError.value = null;
        }
    }
});

const revokeOpen = computed({
    get: () => !!revokeTarget.value,
    set: (value: boolean) => {
        if (!value) revokeTarget.value = null;
    }
});

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function roleChipLabel(share: AccountShare) {
    if (share.role === 'pending') {
        return t('comptesPage.share.pendingRole', { role: t(`comptesPage.roles.${share.invitedRole ?? 'viewer'}`) });
    }
    return t(`comptesPage.roles.${share.role}`);
}

function openEdit(share: AccountShare) {
    editTargetId.value = share.publicId;
    editRole.value = (share.role === 'pending' ? share.invitedRole ?? 'viewer' : share.role) as ShareRole;
    editError.value = null;
}

function openRevokeFromEdit() {
    const share = editTarget.value;
    editTargetId.value = null;
    revokeTarget.value = share;
}

watch(
    () => props.accountPublicId,
    (id) => {
        if (id) void store.loadShares(id).catch(() => undefined);
    },
    { immediate: true }
);

async function confirmEdit() {
    if (!editTarget.value) return;
    const share = editTarget.value;
    if (share.role === 'pending' || share.role === editRole.value) {
        editTarget.value = null;
        return;
    }
    editError.value = null;
    try {
        await store.updateShareRole(props.accountPublicId, share.userPublicId, editRole.value);
        editTargetId.value = null;
    } catch (e: unknown) {
        editError.value = getErrorMessage(e);
    }
}

async function confirmRevoke() {
    if (!revokeTarget.value) return;
    localError.value = null;
    try {
        await store.revokeShare(props.accountPublicId, revokeTarget.value.userPublicId);
        revokeTarget.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <div>
        <div class="d-flex align-center justify-space-between ga-3 flex-wrap mb-3">
            <div>
                <h5 class="text-h6 mb-0">{{ t('comptesPage.share.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.share.subtitle') }}</div>
            </div>
            <v-btn color="primary" variant="tonal" size="small" @click="inviteOpen = true">
                {{ t('comptesPage.share.invite') }}
            </v-btn>
        </div>

        <AppAlert
            v-if="localError || store.error"
            color="error"
            variant="tonal"
            class="mb-3"
            closable
            :dismiss-ms="3000"
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.loadingShares && !store.shares.length" class="py-6 text-center">
            <v-progress-circular indeterminate color="primary" size="28" />
        </div>
        <div v-else-if="!store.shares.length" class="py-6 text-center text-medium-emphasis">
            {{ t('comptesPage.share.empty') }}
        </div>
        <v-list v-else class="py-0 theme-list">
            <v-list-item v-for="share in store.shares" :key="share.publicId" class="px-2 py-3" rounded="md">
                <template #prepend>
                    <UserPhotoAvatar
                        class="mr-3"
                        :photo-url="share.photoUrl"
                        :user-public-id="share.userPublicId"
                        :fallback-label="share.displayName"
                        :size="42"
                    />
                </template>

                <div class="d-flex align-center justify-space-between ga-2 w-100">
                    <div class="min-width-0">
                        <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ share.displayName }}</h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">{{ formatDate(share.createdAt) }}</p>
                    </div>
                    <div class="d-flex align-center ga-2">
                        <v-chip size="small" :color="share.role === 'pending' ? 'warning' : 'secondary'" variant="tonal">
                            {{ roleChipLabel(share) }}
                        </v-chip>
                        <v-btn
                            size="small"
                            variant="text"
                            :icon="true"
                            :disabled="store.acting"
                            @click="openEdit(share)"
                        >
                            <PencilIcon size="18" />
                        </v-btn>
                    </div>
                </div>
            </v-list-item>
        </v-list>

        <ShareInviteModal v-model="inviteOpen" :account-public-id="accountPublicId" />

        <AppModalBase
            v-model="editOpen"
            :title="t('comptesPage.share.editTitle')"
            :max-width="420"
            :scrollable="false"
        >
            <div v-if="editTarget" class="d-flex align-center ga-3 mb-5">
                <UserPhotoAvatar
                    :photo-url="editTarget.photoUrl"
                    :user-public-id="editTarget.userPublicId"
                    :fallback-label="editTarget.displayName"
                    :size="42"
                />
                <div class="min-width-0">
                    <div class="text-subtitle-1 font-weight-bold text-truncate">{{ editTarget.displayName }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ formatDate(editTarget.createdAt) }}</div>
                </div>
            </div>

            <AppAlert
                v-if="editError"
                color="error"
                variant="tonal"
                class="mb-4"
                closable
                :dismiss-ms="3000"
                @dismiss="editError = null"
            >
                {{ editError }}
            </AppAlert>

            <div class="mb-4">
                <div class="text-subtitle-2 mb-2">{{ t('comptesPage.share.fields.role') }}</div>
                <ShareRolePicker v-model="editRole" :disabled="store.acting || editTarget?.role === 'pending'" />
            </div>

            <v-btn variant="tonal" color="error" size="small" :disabled="store.acting" @click="openRevokeFromEdit">
                {{ editTarget?.role === 'pending' ? t('comptesPage.share.cancelInvite') : t('comptesPage.share.revoke') }}
            </v-btn>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="store.acting" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn color="primary" flat :loading="store.acting" :disabled="store.acting || editTarget?.role === 'pending'" @click="confirmEdit">
                    {{ t('comptesPage.share.editConfirm') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppConfirmationModal
            v-model="revokeOpen"
            :title="
                revokeTarget?.role === 'pending' ? t('comptesPage.share.cancelInviteModal.title') : t('comptesPage.share.revokeModal.title')
            "
            :message="
                revokeTarget?.role === 'pending'
                    ? t('comptesPage.share.cancelInviteModal.body', { name: revokeTarget?.displayName })
                    : t('comptesPage.share.revokeModal.body', { name: revokeTarget?.displayName })
            "
            :confirm-label="revokeTarget?.role === 'pending' ? t('comptesPage.share.cancelInvite') : t('comptesPage.share.revoke')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmRevoke"
        />
    </div>
</template>
