<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import { UserPhotoAvatar, useFriendNicknameLabels } from '@/features/friends';
import { PencilIcon } from 'vue-tabler-icons';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { AccountShare } from '@/features/accounts/types';
import AccountShareEditModal from '@/features/accounts/components/modals/AccountShareEditModal.vue';
import ShareInviteModal from '@/features/accounts/components/modals/ShareInviteModal.vue';

const props = defineProps<{
    accountPublicId: string;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();
const { ensureLoaded: ensureNicknameLabels, labelFor } = useFriendNicknameLabels();

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

const revokeTargetLabel = computed(() =>
    revokeTarget.value ? labelFor(revokeTarget.value.userPublicId, revokeTarget.value.displayName) : ''
);

function shareLabel(share: AccountShare) {
    return labelFor(share.userPublicId, share.displayName);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function roleChipLabel(share: AccountShare) {
    if (share.role === 'pending') {
        return t('comptesPage.share.pendingRole', { role: t(`comptesPage.roles.${share.invitedRole ?? 'viewer'}`) });
    }
    return t(`comptesPage.roles.${share.role}`);
}

function hiddenFieldsSummary(share: AccountShare): string | null {
    const effectiveRole = share.role === 'pending' ? share.invitedRole : share.role;
    if (effectiveRole !== 'viewer') return null;
    const fields = share.hiddenFields ?? [];
    if (!fields.length) return t('comptesPage.share.hiddenFields.none');
    return t('comptesPage.share.hiddenFields.summary', {
        fields: fields.map((f) => t(`comptesPage.share.hiddenFields.${f}`)).join(', ')
    });
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
        // force : évite de réafficher un pending stale après accept/refuse/leave hors modale.
        if (id) {
            void store.loadShares(id, true).catch(() => undefined);
            void ensureNicknameLabels().catch(() => undefined);
        }
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
        <header class="shares-panel__header su-section__head">
            <div>
                <h2>{{ t('comptesPage.share.title') }}</h2>
                <p>{{ t('comptesPage.share.subtitle') }}</p>
            </div>
            <button type="button" class="su-btn su-btn--ink" @click="inviteOpen = true">
                {{ t('comptesPage.share.invite') }}
            </button>
        </header>

        <AppModalPanelScroll>
            <AppAlert
                v-if="localError || store.error"
                type="error"
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

            <div v-if="store.loadingShares && !store.shares.length" class="su-loading">
                <span class="su-spin" />
            </div>
            <div v-else-if="!store.shares.length" class="su-empty">
                {{ t('comptesPage.share.empty') }}
            </div>
            <div v-else class="shares-panel__list">
                <div v-for="share in store.shares" :key="share.publicId" class="su-person account-share-row">
                    <UserPhotoAvatar
                        :photo-url="share.photoUrl"
                        :user-public-id="share.userPublicId"
                        :fallback-label="shareLabel(share)"
                        :size="36"
                    />
                    <div class="su-person__meta">
                        <p class="su-person__name">{{ shareLabel(share) }}</p>
                        <p class="su-person__sub">{{ formatDate(share.createdAt) }}</p>
                        <p v-if="hiddenFieldsSummary(share)" class="su-person__sub">{{ hiddenFieldsSummary(share) }}</p>
                    </div>
                    <div class="su-person__actions account-share-row__meta">
                        <span class="su-chip" :style="{ '--chip-color': share.role === 'pending' ? 'var(--violet)' : 'var(--blue)' }">
                            {{ roleChipLabel(share) }}
                        </span>
                        <button
                            type="button"
                            class="su-orb"
                            :aria-label="t('comptesPage.share.editTitle')"
                            :disabled="store.acting"
                            @click="openEdit(share)"
                        >
                            <PencilIcon :size="16" stroke-width="1.6" />
                        </button>
                    </div>
                </div>
            </div>
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
                    ? t('comptesPage.share.cancelInviteModal.body', { name: revokeTargetLabel })
                    : t('comptesPage.share.revokeModal.body', { name: revokeTargetLabel })
            "
            :confirm-label="revokeTarget?.role === 'pending' ? t('comptesPage.share.cancelInvite') : t('comptesPage.share.revoke')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmRevoke"
        />
    </div>
</template>

<style scoped>
/* Partages : lignes su-person (avatar rond = photo), rôle en pastille carrée, action en bouton-icône. */
.shares-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.shares-panel__header {
    flex-shrink: 0;
    align-items: center;
    margin-bottom: 12px;
}

.account-share-row {
    cursor: default;
}

.account-share-row__meta {
    flex-wrap: nowrap;
    gap: 12px;
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
