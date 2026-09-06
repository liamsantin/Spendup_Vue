<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserPhotoAvatar, useFriendNicknameLabels } from '@/features/friends';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { IncomingAccountShare } from '@/features/accounts/types';

const props = defineProps<{
    invite: IncomingAccountShare;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();
const { ensureLoaded: ensureNicknameLabels, labelFor } = useFriendNicknameLabels();
const accepting = ref(false);
const refusing = ref(false);

const ownerLabel = computed(() => labelFor(props.invite.ownerPublicId, props.invite.ownerDisplayName));

onMounted(() => {
    void ensureNicknameLabels().catch(() => undefined);
});

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function onAccept() {
    if (accepting.value || refusing.value || store.acting) return;
    accepting.value = true;
    try {
        await store.acceptShare(props.invite.publicId);
    } catch {
        /* store.error affiche le message métier (ex. amitié requise) */
    } finally {
        accepting.value = false;
    }
}

async function onRefuse() {
    if (accepting.value || refusing.value || store.acting) return;
    refusing.value = true;
    try {
        await store.refuseShare(props.invite.publicId);
    } catch {
        /* store.error */
    } finally {
        refusing.value = false;
    }
}
</script>

<template>
    <div
        class="su-person incoming-share"
        tabindex="-1"
        :data-share-id="props.invite.publicId"
        :aria-current="store.isFocusedShare(props.invite.publicId) ? 'true' : undefined"
        :class="{ 'is-focused': store.isFocusedShare(props.invite.publicId) }"
    >
        <UserPhotoAvatar
            :photo-url="props.invite.ownerPhotoUrl"
            :user-public-id="props.invite.ownerPublicId"
            :fallback-label="ownerLabel"
            :size="44"
        />
        <div class="su-person__meta">
            <p class="su-person__name">{{ props.invite.accountName }}</p>
            <p class="su-person__sub">
                {{
                    t('comptesPage.invitations.from', {
                        name: ownerLabel
                    })
                }}
                · {{ t(`comptesPage.types.${props.invite.accountType}`) }} · {{ props.invite.currency }}
            </p>
            <p class="su-person__sub">
                {{ t(`comptesPage.roles.${props.invite.invitedRole}`) }} · {{ formatDate(props.invite.createdAt) }}
            </p>
            <p v-if="props.invite.invitedRole === 'viewer' && props.invite.hiddenFields?.length" class="incoming-share__note">
                {{
                    t('comptesPage.invitations.hiddenFields', {
                        fields: props.invite.hiddenFields.map((f) => t(`comptesPage.share.hiddenFields.${f}`)).join(', ')
                    })
                }}
            </p>
            <p v-else-if="props.invite.invitedRole === 'viewer' && !props.invite.hiddenFields?.length" class="incoming-share__note">
                {{ t('comptesPage.invitations.noHiddenFields') }}
            </p>
        </div>
        <div class="su-person__actions incoming-share__actions">
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || refusing || accepting" @click.stop="onAccept">
                {{ t('comptesPage.actions.accept') }}
            </button>
            <button type="button" class="su-btn su-btn--danger" :disabled="store.acting || accepting || refusing" @click.stop="onRefuse">
                {{ t('comptesPage.actions.refuse') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.incoming-share {
    cursor: default;
    align-items: flex-start;
}

.incoming-share__note {
    margin: 4px 0 0;
    color: var(--ink-muted);
    font-size: 12.5px;
    line-height: 1.4;
    white-space: normal;
}

@media (max-width: 599.98px) {
    .incoming-share__actions {
        width: 100%;
        justify-content: stretch;
    }

    .incoming-share__actions .su-btn {
        flex: 1 1 0;
    }
}
</style>
