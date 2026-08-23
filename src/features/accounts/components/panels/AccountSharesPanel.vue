<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import { UserPhotoAvatar } from '@/features/friends';
import { PencilIcon } from 'vue-tabler-icons';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '../../stores/accounts-store';
import type { AccountShare } from '../../types';
import AccountShareEditModal from '../modals/AccountShareEditModal.vue';
import ShareInviteModal from '../modals/ShareInviteModal.vue';

const props = defineProps<{
    accountPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const inviteOpen = ref(false);
const editTargetId = ref<string | null>(null);
const revokeTarget = ref<AccountShare | null>(null);
const localError = ref<string | null>(null);

/** Toujours synchronisé avec le store — reflète les mises à jour de photoUrl, displayName, role. */
const editTarget = computed(() => (editTargetId.value ? (store.shares.find((s) => s.publicId === editTargetId.value) ?? null) : null));

const editOpen = computed({
    get: () => !!editTargetId.value,
    set: (value: boolean) => {
        if (!value) editTargetId.value = null;
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
}

function onRevokeFromEdit(share: AccountShare) {
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
    <div class="shares-panel">
        <div class="shares-panel__header d-flex align-center justify-space-between ga-3 flex-wrap mb-3">
            <div>
                <h5 class="text-h6 mb-0">{{ t('comptesPage.share.title') }}</h5>
                <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.share.subtitle') }}</div>
            </div>
            <v-btn color="primary" variant="tonal" size="small" @click="inviteOpen = true">
                {{ t('comptesPage.share.invite') }}
            </v-btn>
        </div>

        <AppModalPanelScroll>
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

                    <div class="account-share-row w-100">
                        <div class="min-width-0">
                            <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ share.displayName }}</h6>
                            <p class="text-body-2 text-medium-emphasis mb-0">{{ formatDate(share.createdAt) }}</p>
                        </div>
                        <div class="account-share-row__meta">
                            <v-chip size="small" :color="share.role === 'pending' ? 'warning' : 'secondary'" variant="tonal">
                                {{ roleChipLabel(share) }}
                            </v-chip>
                            <v-btn
                                size="small"
                                variant="text"
                                :icon="true"
                                :aria-label="t('comptesPage.share.editTitle')"
                                :disabled="store.acting"
                                @click="openEdit(share)"
                            >
                                <PencilIcon size="18" />
                            </v-btn>
                        </div>
                    </div>
                </v-list-item>
            </v-list>
        </AppModalPanelScroll>

        <ShareInviteModal v-model="inviteOpen" :account-public-id="accountPublicId" />

        <AccountShareEditModal v-model="editOpen" :account-public-id="accountPublicId" :share="editTarget" @revoke="onRevokeFromEdit" />

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

<style scoped>
.shares-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.shares-panel__header {
    flex-shrink: 0;
}

.account-share-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.account-share-row__meta {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
}

@media (max-width: 599.98px) {
    .account-share-row {
        flex-wrap: wrap;
        align-items: flex-start;
    }

    .account-share-row__meta {
        width: 100%;
        justify-content: space-between;
    }
}
</style>
