<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { InboxIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import { shouldVirtualize } from '@/utils/helpers/list-virtualization';
import { useAccountsStore } from '../stores/accounts-store';
import IncomingShareListItem from './IncomingShareListItem.vue';

const { t } = useI18n();
const store = useAccountsStore();
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
                            <v-virtual-scroll
                                v-else-if="shouldVirtualize(store.incomingShares.length)"
                                :items="store.incomingShares"
                                height="480"
                                :item-height="88"
                                class="v-list py-0 theme-list"
                            >
                                <template #default="{ item }">
                                    <IncomingShareListItem :invite="item" />
                                </template>
                            </v-virtual-scroll>
                            <v-list v-else class="py-0 theme-list">
                                <IncomingShareListItem v-for="invite in store.incomingShares" :key="invite.publicId" :invite="invite" />
                            </v-list>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>
