<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '../stores/accounts-store';
import type { AccountShare, ShareRole } from '../types';
import ShareInviteModal from './ShareInviteModal.vue';

const props = defineProps<{
    accountPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

const inviteOpen = ref(false);
const revokeTarget = ref<AccountShare | null>(null);
const localError = ref<string | null>(null);

const revokeOpen = computed({
    get: () => !!revokeTarget.value,
    set: (value: boolean) => {
        if (!value) revokeTarget.value = null;
    }
});

const roleItems = computed(() => [
    { title: t('comptesPage.roles.viewer'), value: 'viewer' as ShareRole },
    { title: t('comptesPage.roles.editor'), value: 'editor' as ShareRole }
]);

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function roleChipLabel(share: AccountShare) {
    if (share.role === 'pending') {
        return t('comptesPage.share.pendingRole', { role: t(`comptesPage.roles.${share.invitedRole ?? 'viewer'}`) });
    }
    return t(`comptesPage.roles.${share.role}`);
}

watch(
    () => props.accountPublicId,
    (id) => {
        if (id) void store.loadShares(id, true).catch(() => undefined);
    },
    { immediate: true }
);

async function onRoleChange(share: AccountShare, role: ShareRole) {
    if (share.role === 'pending' || share.role === role) return;
    localError.value = null;
    try {
        await store.updateShareRole(props.accountPublicId, share.userPublicId, role);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
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
            type="error"
            class="mb-3"
            closable
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
                    <v-avatar size="42" class="mr-3" color="lightprimary">
                        <v-img v-if="share.photoUrl" :src="share.photoUrl" cover :alt="share.displayName" />
                        <span v-else class="text-subtitle-2 font-weight-bold text-primary">
                            {{ share.displayName.slice(0, 1).toUpperCase() }}
                        </span>
                    </v-avatar>
                </template>

                <div class="d-flex align-start justify-space-between ga-2 w-100">
                    <div class="min-width-0">
                        <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ share.displayName }}</h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">{{ formatDate(share.createdAt) }}</p>
                    </div>
                    <div class="d-flex flex-wrap align-center justify-end ga-2">
                        <v-chip v-if="share.role === 'pending'" size="small" color="warning" variant="tonal">
                            {{ roleChipLabel(share) }}
                        </v-chip>
                        <v-select
                            v-else
                            :model-value="share.role"
                            :items="roleItems"
                            density="compact"
                            variant="outlined"
                            hide-details
                            style="max-width: 140px"
                            :disabled="store.acting"
                            @update:model-value="onRoleChange(share, $event as ShareRole)"
                        />
                        <v-btn size="small" variant="text" color="error" :disabled="store.acting" @click="revokeTarget = share">
                            {{ share.role === 'pending' ? t('comptesPage.share.cancelInvite') : t('comptesPage.share.revoke') }}
                        </v-btn>
                    </div>
                </div>
            </v-list-item>
        </v-list>

        <ShareInviteModal v-model="inviteOpen" :account-public-id="accountPublicId" />

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
