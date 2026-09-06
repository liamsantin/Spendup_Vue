<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BuildingBankIcon, PlusIcon, ShareIcon } from 'vue-tabler-icons';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { shouldVirtualize } from '@/utils/helpers/list-virtualization';
import { canEditAccount } from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import type { Account } from '@/features/accounts/types';
import AccountDetailModal from '@/features/accounts/components/modals/AccountDetailModal.vue';
import AccountFormModal from '@/features/accounts/components/modals/AccountFormModal.vue';
import AccountListItem from '@/features/accounts/components/list/AccountListItem.vue';

const { t } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();

function useVirtualList(length: number) {
    // Deep-link focus : garder la ligne dans le DOM (virtual scroll la retirerait).
    if (store.focusAccountPublicId) return false;
    return !smAndDown.value && shouldVirtualize(length);
}

const createOpen = ref(false);
const detailOpen = ref(false);
const detailAccountId = ref<string | null>(null);
const editAccount = ref<Account | null>(null);

function openDetail(account: Account) {
    detailAccountId.value = account.publicId;
    detailOpen.value = true;
}

function openEdit(account: Account) {
    if (!canEditAccount(account)) return;
    detailOpen.value = false;
    editAccount.value = account;
}

function setEditOpen(value: boolean) {
    if (!value) editAccount.value = null;
}
</script>

<template>
    <div>
        <AppAlert
            v-if="store.error"
            type="error"
            class="su-alert"
            closable
            :dismiss-ms="3000"
            @dismiss="store.clearError()"
        >
            {{ store.error }}
        </AppAlert>

        <div class="su-split">
            <section class="su-surface">
                <header class="su-panel__head">
                    <span class="su-panel__icon"><BuildingBankIcon :size="20" stroke-width="1.5" /></span>
                    <div>
                        <h2>{{ t('comptesPage.sections.owned') }}</h2>
                        <p>{{ t('comptesPage.sections.ownedSubtitle') }}</p>
                    </div>
                    <button type="button" class="su-btn su-btn--ink" @click="createOpen = true">
                        <PlusIcon :size="16" stroke-width="1.6" />
                        {{ t('comptesPage.actions.create') }}
                    </button>
                </header>

                <div v-if="store.loadingAccounts && !store.ownedAccounts.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.ownedAccounts.length" class="su-empty">
                    {{ t('comptesPage.empty.owned') }}
                </div>
                <template v-else>
                    <div v-if="store.activeOwnedAccounts.length" class="accounts-list">
                        <v-virtual-scroll
                            v-if="useVirtualList(store.activeOwnedAccounts.length)"
                            :items="store.activeOwnedAccounts"
                            height="480"
                            :item-height="108"
                            class="py-0"
                        >
                            <template #default="{ item }">
                                <AccountListItem :account="item" @open="openDetail" @edit="openEdit" />
                            </template>
                        </v-virtual-scroll>
                        <TransitionGroup v-else name="account-move" tag="div" class="py-0">
                            <AccountListItem
                                v-for="account in store.activeOwnedAccounts"
                                :key="account.publicId"
                                :account="account"
                                @open="openDetail"
                                @edit="openEdit"
                            />
                        </TransitionGroup>
                    </div>
                    <div v-if="store.archivedOwnedAccounts.length">
                        <div class="su-section-label">{{ t('comptesPage.sections.archived') }}</div>
                        <v-virtual-scroll
                            v-if="useVirtualList(store.archivedOwnedAccounts.length)"
                            :items="store.archivedOwnedAccounts"
                            height="360"
                            :item-height="108"
                            class="py-0"
                        >
                            <template #default="{ item }">
                                <AccountListItem :account="item" @open="openDetail" @edit="openEdit" />
                            </template>
                        </v-virtual-scroll>
                        <v-list v-else class="py-0">
                            <AccountListItem
                                v-for="account in store.archivedOwnedAccounts"
                                :key="account.publicId"
                                :account="account"
                                @open="openDetail"
                                @edit="openEdit"
                            />
                        </v-list>
                    </div>
                </template>
            </section>

            <section class="su-surface">
                <header class="su-panel__head">
                    <span class="su-panel__icon"><ShareIcon :size="20" stroke-width="1.5" /></span>
                    <div>
                        <h2>{{ t('comptesPage.sections.shared') }}</h2>
                        <p>{{ t('comptesPage.sections.sharedSubtitle') }}</p>
                    </div>
                </header>

                <div v-if="store.loadingAccounts && !store.sharedAccounts.length" class="su-loading">
                    <span class="su-spin" />
                </div>
                <div v-else-if="!store.sharedAccounts.length" class="su-empty">
                    {{ t('comptesPage.empty.shared') }}
                </div>
                <v-virtual-scroll
                    v-else-if="useVirtualList(store.sharedAccounts.length)"
                    :items="store.sharedAccounts"
                    height="480"
                    :item-height="108"
                    class="py-0"
                >
                    <template #default="{ item }">
                        <AccountListItem :account="item" @open="openDetail" @edit="openEdit" />
                    </template>
                </v-virtual-scroll>
                <v-list v-else class="py-0">
                    <AccountListItem
                        v-for="account in store.sharedAccounts"
                        :key="account.publicId"
                        :account="account"
                        @open="openDetail"
                        @edit="openEdit"
                    />
                </v-list>
            </section>
        </div>

        <AccountFormModal v-model="createOpen" />
        <AccountFormModal :model-value="!!editAccount" :account="editAccount" @update:model-value="setEditOpen" />
        <AccountDetailModal v-model="detailOpen" :account-public-id="detailAccountId" />
    </div>
</template>

<style scoped>
.accounts-list {
    overflow-x: clip;
}

.account-move-move {
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
    .account-move-move {
        transition: none;
    }
}

@media (max-width: 767px) {
    .su-panel__head > .su-btn {
        width: 100%;
        margin-left: 0;
    }
}
</style>
