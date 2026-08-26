<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserPhotoAvatar } from '@/features/friends';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { IncomingAccountShare } from '@/features/accounts/types';

const props = defineProps<{
    invite: IncomingAccountShare;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();
const accepting = ref(false);
const refusing = ref(false);

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
    <v-list-item
        class="px-2 py-3"
        rounded="md"
        tabindex="-1"
        :data-share-id="props.invite.publicId"
        :aria-current="store.isFocusedShare(props.invite.publicId) ? 'true' : undefined"
        :class="{ 'bg-lightprimary': store.isFocusedShare(props.invite.publicId) }"
    >
        <template #prepend>
            <UserPhotoAvatar
                class="mr-3"
                :photo-url="props.invite.ownerPhotoUrl"
                :user-public-id="props.invite.ownerPublicId"
                :fallback-label="props.invite.ownerDisplayName"
                :size="46"
            />
        </template>

        <div class="incoming-share w-100">
            <div class="incoming-share__text min-width-0">
                <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">
                    {{ props.invite.accountName }}
                </h6>
                <p class="text-body-2 text-medium-emphasis mb-1 text-truncate">
                    {{
                        t('comptesPage.invitations.from', {
                            name: props.invite.ownerDisplayName
                        })
                    }}
                    · {{ t(`comptesPage.types.${props.invite.accountType}`) }} · {{ props.invite.currency }}
                </p>
                <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ t(`comptesPage.roles.${props.invite.invitedRole}`) }} · {{ formatDate(props.invite.createdAt) }}
                </p>
                <p
                    v-if="props.invite.invitedRole === 'viewer' && props.invite.hiddenFields?.length"
                    class="text-caption text-medium-emphasis mb-0 mt-1"
                >
                    {{
                        t('comptesPage.invitations.hiddenFields', {
                            fields: props.invite.hiddenFields.map((f) => t(`comptesPage.share.hiddenFields.${f}`)).join(', ')
                        })
                    }}
                </p>
                <p
                    v-else-if="props.invite.invitedRole === 'viewer' && !(props.invite.hiddenFields?.length)"
                    class="text-caption text-medium-emphasis mb-0 mt-1"
                >
                    {{ t('comptesPage.invitations.noHiddenFields') }}
                </p>
            </div>
            <div class="incoming-share__actions">
                <v-btn
                    size="small"
                    variant="flat"
                    color="primary"
                    :loading="accepting"
                    :disabled="store.acting || refusing"
                    @click.stop="onAccept"
                >
                    {{ t('comptesPage.actions.accept') }}
                </v-btn>
                <v-btn
                    size="small"
                    variant="tonal"
                    color="error"
                    :loading="refusing"
                    :disabled="store.acting || accepting"
                    @click.stop="onRefuse"
                >
                    {{ t('comptesPage.actions.refuse') }}
                </v-btn>
            </div>
        </div>
    </v-list-item>
</template>

<style scoped>
.incoming-share {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.incoming-share__actions {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

@media (max-width: 599.98px) {
    .incoming-share {
        flex-direction: column;
        align-items: stretch;
    }

    .incoming-share__actions {
        width: 100%;
        justify-content: stretch;
    }

    .incoming-share__actions :deep(.v-btn) {
        flex: 1 1 0;
    }
}
</style>
