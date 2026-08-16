<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BuildingBankIcon, PlusIcon, ShareIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import { useAccountsStore } from '../stores/accounts-store';
import type { Account } from '../types';
import AccountDetailModal from './AccountDetailModal.vue';
import AccountFormModal from './AccountFormModal.vue';
import AccountListItem from './AccountListItem.vue';

const { t } = useI18n();
const store = useAccountsStore();

const createOpen = ref(false);
const detailOpen = ref(false);
const detailAccountId = ref<string | null>(null);

function openDetail(account: Account) {
    detailAccountId.value = account.publicId;
    detailOpen.value = true;
}

onMounted(() => {
    void store.loadAccounts().catch(() => undefined);
});
</script>

<template>
    <AppAlert v-if="store.error" type="error" density="default" class="mb-4" closable @dismiss="store.clearError()">
        {{ store.error }}
    </AppAlert>

    <div class="accounts-tab-content">
        <v-row>
            <v-col cols="12" md="6" class="pa-3">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
                            <div class="d-flex align-center ga-3 min-width-0">
                                <v-avatar size="48" rounded="md" color="lightprimary">
                                    <BuildingBankIcon class="text-primary" size="25" />
                                </v-avatar>
                                <div class="min-width-0">
                                    <h4 class="text-h4 mb-0">{{ t('comptesPage.sections.owned') }}</h4>
                                    <div class="text-subtitle-1 text-medium-emphasis text-10">
                                        {{ t('comptesPage.sections.ownedSubtitle') }}
                                    </div>
                                </div>
                            </div>
                            <v-btn color="primary" @click="createOpen = true">
                                <PlusIcon size="18" class="mr-1" />
                                {{ t('comptesPage.actions.create') }}
                            </v-btn>
                        </div>

                        <div class="mt-4">
                            <div v-if="store.loadingAccounts && !store.ownedAccounts.length" class="py-6 text-center">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>
                            <div v-else-if="!store.ownedAccounts.length" class="py-6 text-center text-medium-emphasis">
                                {{ t('comptesPage.empty.owned') }}
                            </div>
                            <template v-else>
                                <div v-if="store.activeOwnedAccounts.length" class="mb-2">
                                    <v-list class="py-0 theme-list">
                                        <AccountListItem
                                            v-for="account in store.activeOwnedAccounts"
                                            :key="account.publicId"
                                            :account="account"
                                            @open="openDetail"
                                        />
                                    </v-list>
                                </div>
                                <div v-if="store.archivedOwnedAccounts.length" class="mt-4">
                                    <div class="text-subtitle-2 text-medium-emphasis mb-2">
                                        {{ t('comptesPage.sections.archived') }}
                                    </div>
                                    <v-list class="py-0 theme-list">
                                        <AccountListItem
                                            v-for="account in store.archivedOwnedAccounts"
                                            :key="account.publicId"
                                            :account="account"
                                            @open="openDetail"
                                        />
                                    </v-list>
                                </div>
                            </template>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="6" class="pa-3">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 min-width-0">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <ShareIcon class="text-primary" size="25" />
                            </v-avatar>
                            <div class="min-width-0">
                                <h4 class="text-h4 mb-0">{{ t('comptesPage.sections.shared') }}</h4>
                                <div class="text-subtitle-1 text-medium-emphasis text-10">
                                    {{ t('comptesPage.sections.sharedSubtitle') }}
                                </div>
                            </div>
                        </div>

                        <div class="mt-4">
                            <div v-if="store.loadingAccounts && !store.sharedAccounts.length" class="py-6 text-center">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>
                            <div v-else-if="!store.sharedAccounts.length" class="py-6 text-center text-medium-emphasis">
                                {{ t('comptesPage.empty.shared') }}
                            </div>
                            <v-list v-else class="py-0 theme-list">
                                <AccountListItem
                                    v-for="account in store.sharedAccounts"
                                    :key="account.publicId"
                                    :account="account"
                                    @open="openDetail"
                                />
                            </v-list>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>

    <AccountFormModal v-model="createOpen" />
    <AccountDetailModal v-model="detailOpen" :account-public-id="detailAccountId" />
</template>

<style scoped>
.accounts-tab-content {
    padding: 4px 2px 12px;
}
</style>
