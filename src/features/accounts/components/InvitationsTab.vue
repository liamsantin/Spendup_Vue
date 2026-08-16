<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { InboxIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import { UserPhotoAvatar } from '@/features/friends';
import { useAccountsStore } from '../stores/accounts-store';

const { t, locale } = useI18n();
const store = useAccountsStore();

function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

onMounted(() => {
    void store.loadIncoming().catch(() => undefined);
});
</script>

<template>
    <div>
        <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.clearError()">
            {{ store.error }}
        </AppAlert>

        <v-row justify="center">
            <v-col cols="12" md="9" class="pa-3">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
                            <div class="d-flex align-center ga-3 min-width-0">
                                <v-avatar size="48" rounded="md" color="lightprimary">
                                    <InboxIcon class="text-primary" size="25" />
                                </v-avatar>
                                <div class="min-width-0">
                                    <h4 class="text-h4 mb-0">{{ t('comptesPage.invitations.title') }}</h4>
                                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                                        {{ t('comptesPage.invitations.subtitle') }}
                                    </div>
                                </div>
                            </div>
                            <v-chip v-if="store.incomingCount > 0" color="primary" size="small" variant="flat">
                                {{ store.incomingCount }}
                            </v-chip>
                        </div>

                        <div class="mt-4">
                            <div v-if="store.loadingIncoming && !store.incomingShares.length" class="py-6 text-center">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>
                            <div v-else-if="!store.incomingShares.length" class="py-6 text-center text-medium-emphasis">
                                {{ t('comptesPage.empty.invitations') }}
                            </div>
                            <v-list v-else class="py-0 theme-list">
                                <v-list-item
                                    v-for="invite in store.incomingShares"
                                    :key="invite.publicId"
                                    class="px-2 py-3"
                                    rounded="md"
                                    :data-share-id="invite.publicId"
                                    :class="{ 'bg-lightprimary': store.isFocusedShare(invite.publicId) }"
                                >
                                    <template #prepend>
                                        <UserPhotoAvatar
                                            class="mr-3"
                                            :photo-url="invite.ownerPhotoUrl"
                                            :user-public-id="invite.ownerPublicId"
                                            :fallback-label="invite.ownerDisplayName"
                                            :size="46"
                                        />
                                    </template>

                                    <div class="d-flex align-start justify-space-between ga-2 w-100">
                                        <div class="min-width-0">
                                            <h6 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">
                                                {{ invite.accountName }}
                                            </h6>
                                            <p class="text-body-2 text-medium-emphasis mb-1 text-truncate">
                                                {{
                                                    t('comptesPage.invitations.from', {
                                                        name: invite.ownerDisplayName
                                                    })
                                                }}
                                                · {{ t(`comptesPage.types.${invite.accountType}`) }} · {{ invite.currency }}
                                            </p>
                                            <p class="text-body-2 text-medium-emphasis mb-0">
                                                {{ t(`comptesPage.roles.${invite.invitedRole}`) }} · {{ formatDate(invite.createdAt) }}
                                            </p>
                                        </div>
                                        <div class="d-flex flex-wrap justify-end ga-2">
                                            <v-btn
                                                size="small"
                                                variant="text"
                                                color="primary"
                                                :disabled="store.acting"
                                                @click.stop="store.acceptShare(invite.publicId)"
                                            >
                                                {{ t('comptesPage.actions.accept') }}
                                            </v-btn>
                                            <v-btn
                                                size="small"
                                                variant="text"
                                                color="error"
                                                :disabled="store.acting"
                                                @click.stop="store.refuseShare(invite.publicId)"
                                            >
                                                {{ t('comptesPage.actions.refuse') }}
                                            </v-btn>
                                        </div>
                                    </div>
                                </v-list-item>
                            </v-list>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>
