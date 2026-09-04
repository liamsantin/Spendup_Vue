<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { BuildingBankIcon, BellPlusIcon } from 'vue-tabler-icons';
import AppTabsShell from '@/components/shared/tabs/AppTabsShell.vue';
import { AccountsTab, InvitationsTab, useAccountsStore } from '@/features/accounts';

const ACCOUNT_TABS = ['Accounts', 'Invitations'] as const;
type AccountTab = (typeof ACCOUNT_TABS)[number];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useAccountsStore();

const FOCUS_CLEAR_MS = 2800;
let focusClearTimer: ReturnType<typeof setTimeout> | null = null;

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

/** Onglet initial : priorise le deep-link (share → Invitations, account → Accounts). */
function resolveInitialTab(): AccountTab {
    if (shareFromQuery()) return 'Invitations';
    if (accountFromQuery()) return 'Accounts';
    return tabFromQuery();
}

const tab = ref<AccountTab>(resolveInitialTab());
const syncingTabFromRoute = ref(false);

const tabs = computed(() => [
    { value: 'Accounts', label: t('comptesPage.tabs.accounts'), icon: BuildingBankIcon },
    {
        value: 'Invitations',
        label: t('comptesPage.tabs.invitations'),
        icon: BellPlusIcon,
        chip: store.incomingCount > 0 ? store.incomingCount : undefined
    }
]);

function clearFocusClearTimer() {
    if (focusClearTimer) {
        clearTimeout(focusClearTimer);
        focusClearTimer = null;
    }
}

function scheduleClearFocus() {
    clearFocusClearTimer();
    focusClearTimer = setTimeout(() => {
        store.setFocusAccount(null);
        store.setFocusShare(null);
        focusClearTimer = null;
    }, FOCUS_CLEAR_MS);
}

async function scrollToFocused() {
    await nextTick();
    // 2e tick : laisser TransitionGroup / virtual-scroll désactivé (focus) peindre le DOM.
    await nextTick();

    const accountId = store.focusAccountPublicId;
    if (accountId) {
        const el = document.querySelector(`[data-account-id="${CSS.escape(accountId)}"]`);
        if (el instanceof HTMLElement) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus({ preventScroll: true });
            scheduleClearFocus();
            return;
        }
    }
    const shareId = store.focusSharePublicId;
    if (shareId) {
        const el = document.querySelector(`[data-share-id="${CSS.escape(shareId)}"]`);
        if (el instanceof HTMLElement) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus({ preventScroll: true });
            scheduleClearFocus();
        }
    }
}

function syncTabQuery(value: AccountTab) {
    if (route.query.tab === value) return;
    void router.replace({
        query: {
            ...route.query,
            tab: value
        }
    });
}

/** Filet si SignalR off / event manqué : refetch à la reprise de visibilité. */
function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    if (tab.value === 'Accounts') {
        void store.loadAccounts(true).catch(() => undefined);
        return;
    }
    void store.loadIncoming(true).catch(() => undefined);
}

onMounted(() => {
    const accountId = accountFromQuery();
    const shareId = shareFromQuery();
    store.setFocusAccount(accountId);
    store.setFocusShare(shareId);
    if (shareId) tab.value = 'Invitations';
    else if (accountId) tab.value = 'Accounts';
    syncTabQuery(tab.value);

    document.addEventListener('visibilitychange', onVisibilityChange);
    void store
        .bootstrap(tab.value)
        .then(() => scrollToFocused())
        .catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    clearFocusClearTimer();
});

watch(
    () => route.query.tab,
    () => {
        const next = tabFromQuery();
        if (next === tab.value) return;
        syncingTabFromRoute.value = true;
        tab.value = next;
        void nextTick(() => {
            syncingTabFromRoute.value = false;
        });
    }
);

watch(
    () => route.query.account,
    (value) => {
        const id = typeof value === 'string' ? value : null;
        store.setFocusAccount(id);
        if (id && tab.value !== 'Accounts') {
            tab.value = 'Accounts';
        }
        void scrollToFocused();
    }
);

watch(
    () => route.query.share,
    (value) => {
        const id = typeof value === 'string' ? value : null;
        store.setFocusShare(id);
        if (id && tab.value !== 'Invitations') {
            tab.value = 'Invitations';
        }
        void scrollToFocused();
    }
);

watch(tab, (value) => {
    if (!syncingTabFromRoute.value) {
        syncTabQuery(value);
    }
    void store
        .openTab(value)
        .then(() => scrollToFocused())
        .catch(() => undefined);
});
</script>

<template>
    <AppTabsShell v-model="tab" :tabs="tabs" :title="t('comptesPage.title')" :subtitle="t('comptesPage.subtitle')" hide-actions>
        <Transition name="su-pane" mode="out-in">
            <AccountsTab v-if="tab === 'Accounts'" key="Accounts" />
            <InvitationsTab v-else key="Invitations" />
        </Transition>
    </AppTabsShell>
</template>
