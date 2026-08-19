<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { UserPhotoAvatar } from '@/features/friends';
import { useAccountsStore } from '../stores/accounts-store';
import type { IncomingAccountShare } from '../types';

const props = defineProps<{
    invite: IncomingAccountShare;
}>();

const { t, locale } = useI18n();
const store = useAccountsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
</script>

<template>
    <v-list-item
        class="px-2 py-3"
        rounded="md"
        :data-share-id="props.invite.publicId"
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
            </div>
            <div class="incoming-share__actions">
                <v-btn
                    size="small"
                    variant="flat"
                    color="primary"
                    :disabled="store.acting"
                    @click.stop="store.acceptShare(props.invite.publicId)"
                >
                    {{ t('comptesPage.actions.accept') }}
                </v-btn>
                <v-btn
                    size="small"
                    variant="tonal"
                    color="error"
                    :disabled="store.acting"
                    @click.stop="store.refuseShare(props.invite.publicId)"
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
