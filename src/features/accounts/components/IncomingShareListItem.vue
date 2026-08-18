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

        <div class="d-flex align-start justify-space-between ga-2 w-100">
            <div class="min-width-0">
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
            <div class="d-flex flex-wrap justify-end ga-2">
                <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    :disabled="store.acting"
                    @click.stop="store.acceptShare(props.invite.publicId)"
                >
                    {{ t('comptesPage.actions.accept') }}
                </v-btn>
                <v-btn
                    size="small"
                    variant="text"
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
