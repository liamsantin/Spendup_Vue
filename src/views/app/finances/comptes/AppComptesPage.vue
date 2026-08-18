<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { BuildingBankIcon, BellPlusIcon, RefreshIcon } from 'vue-tabler-icons';
import AppTabsShell from '@/components/shared/tabs/AppTabsShell.vue';
import { AccountsTab, InvitationsTab, useAccountsStore } from '@/features/accounts';

const ACCOUNT_TABS = ['Accounts', 'Invitations'] as const;
type AccountTab = (typeof ACCOUNT_TABS)[number];

const { t } = useI18n();
const route = useRoute();
const store = useAccountsStore();

function tabFromQuery(): AccountTab {
    const raw = route.query.tab;
    if (typeof raw === 'string' && (ACCOUNT_TABS as readonly string[]).includes(raw)) {
        return raw as AccountTab;
    }
    return 'Accounts';
}

function accountFromQuery(): string | null {
    const raw = route.query.account;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function shareFromQuery(): string | null {
    const raw = route.query.share;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const tab = ref<AccountTab>(tabFromQuery());

const tabs = computed(() => [
    { value: 'Accounts', label: t('comptesPage.tabs.accounts'), icon: BuildingBankIcon },
    {
        value: 'Invitations',
        label: t('comptesPage.tabs.invitations'),
        icon: BellPlusIcon,
        chip: store.incomingCount > 0 ? store.incomingCount : undefined
    }
]);

async function scrollToFocused() {
    await nextTick();
    const accountId = store.focusAccountPublicId;
    if (accountId) {
        const el = document.querySelector(`[data-account-id="${CSS.escape(accountId)}"]`);
        if (el instanceof HTMLElement) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }
    const shareId = store.focusSharePublicId;
    if (shareId) {
        const el = document.querySelector(`[data-share-id="${CSS.escape(shareId)}"]`);
        if (el instanceof HTMLElement) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

onMounted(() => {
    store.setFocusAccount(accountFromQuery());
    store.setFocusShare(shareFromQuery());
    void store
        .bootstrap(tab.value)
        .then(() => scrollToFocused())
        .catch(() => undefined);
});

watch(
    () => route.query.tab,
    () => {
        tab.value = tabFromQuery();
    }
);

watch(
    () => route.query.account,
    (value) => {
        store.setFocusAccount(typeof value === 'string' ? value : null);
        void scrollToFocused();
    }
);

watch(
    () => route.query.share,
    (value) => {
        store.setFocusShare(typeof value === 'string' ? value : null);
        void scrollToFocused();
    }
);

watch(tab, (value) => {
    void store
        .openTab(value)
        .then(() => scrollToFocused())
        .catch(() => undefined);
});
</script>

<template>
    <AppTabsShell v-model="tab" :tabs="tabs" align-tabs="center" hide-actions>
        <template #toolbar>
            <div class="d-flex justify-end">
                <v-btn
                    variant="text"
                    size="small"
                    :loading="store.loadingAccounts || store.loadingIncoming"
                    :disabled="store.acting"
                    @click="store.refreshAll().catch(() => undefined)"
                >
                    <RefreshIcon size="18" class="mr-1" />
                    {{ t('common.refresh') }}
                </v-btn>
            </div>
        </template>
        <v-window v-model="tab">
            <v-window-item value="Accounts">
                <AccountsTab />
            </v-window-item>
            <v-window-item value="Invitations">
                <InvitationsTab />
            </v-window-item>
        </v-window>
    </AppTabsShell>
</template>
