<script setup lang="ts">
/**
 * Fiche d’un compte (page, plus de modale) : titre, actions, onglets sous le titre
 * (`?tab=details|snapshots|paymentMethods|shares|documents`). Chemin : `/app/finances/comptes/:publicId`.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, PencilIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import {
    ACCOUNTS_BASE,
    ACCOUNT_DETAIL_TABS,
    AccountDetail,
    accountIdFromPath,
    activeAccountDetailTab,
    canManageShares,
    isBalanceHidden,
    useAccountsStore,
    type AccountDetailTab
} from '@/features/accounts';
import { readReturnTo } from '@/utils/helpers/navigation-helpers';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useAccountsStore();

const detailRef = ref<{ openEdit: () => void; canEdit: boolean } | null>(null);
const notFound = ref(false);

const publicId = computed(() => accountIdFromPath(route.path));
const account = computed(() => (store.selectedAccount?.publicId === publicId.value ? store.selectedAccount : null));
const activeTab = computed(() => activeAccountDetailTab(route.query.tab));

const title = computed(() => (notFound.value || !account.value ? t('comptesPage.detail.title') : account.value.name));
const subtitle = computed(() => (account.value && !notFound.value ? t(`comptesPage.types.${account.value.type}`) : undefined));

/** Onglets indisponibles (solde masqué, pas de droit de partage, compte partagé) : grisés avec explication. */
const tabs = computed(() => {
    const current = account.value;
    const balanceHidden = !!current && isBalanceHidden(current);
    const shareDenied = !!current && !canManageShares(current);
    const documentsDenied = !!current && !current.isOwned;
    const state: Record<AccountDetailTab, { disabled: boolean; title?: string }> = {
        details: { disabled: false },
        snapshots: { disabled: balanceHidden, title: balanceHidden ? t('comptesPage.detail.snapshotsHiddenHint') : undefined },
        paymentMethods: { disabled: false },
        shares: { disabled: shareDenied, title: shareDenied ? t('comptesPage.detail.shareUnavailable') : undefined },
        documents: { disabled: documentsDenied, title: documentsDenied ? t('comptesPage.detail.documentsUnavailable') : undefined }
    };
    return ACCOUNT_DETAIL_TABS.map((value) => ({ value, label: t(`comptesPage.detail.tabs.${value}`), ...state[value] }));
});

function selectTab(tab: AccountDetailTab) {
    if (tab === activeTab.value) return;
    const query = { ...route.query };
    if (tab === ACCOUNT_DETAIL_TABS[0]) delete query.tab;
    else query.tab = tab;
    void router.replace({ path: route.path, query });
}

function backToList() {
    void router.push({ path: ACCOUNTS_BASE, query: { tab: 'Accounts' } });
}

function goBack() {
    const origin = readReturnTo();
    if (origin) void router.push(origin);
    else backToList();
}

watch(publicId, () => {
    notFound.value = false;
});
</script>

<template>
    <AppPageShell :key="`account-${publicId}`" :title="title" :subtitle="subtitle">
        <template #actions>
            <button type="button" class="su-btn" @click="goBack">
                <ArrowLeftIcon :size="16" stroke-width="1.6" />
                {{ t('common.back') }}
            </button>
            <button
                v-if="!notFound && account && detailRef?.canEdit"
                type="button"
                class="su-btn su-btn--ink"
                :disabled="store.acting"
                @click="detailRef?.openEdit()"
            >
                <PencilIcon :size="16" stroke-width="1.6" />
                {{ t('comptesPage.actions.edit') }}
            </button>
        </template>

        <template #hero-extra>
            <nav v-if="!notFound && publicId" class="su-tabs su-tabs--links account-page__tabs" :aria-label="t('comptesPage.detail.title')">
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': activeTab === tab.value }"
                    :aria-current="activeTab === tab.value ? 'page' : undefined"
                    :disabled="tab.disabled"
                    :title="tab.title"
                    @click="selectTab(tab.value)"
                >
                    <span class="su-tab__label" :data-label="tab.label">{{ tab.label }}</span>
                </button>
            </nav>
        </template>

        <div v-if="notFound || !publicId" class="su-empty account-page__not-found">
            <p>{{ t('comptesPage.detail.title') }} — 404</p>
            <button type="button" class="su-link account-page__back" @click="backToList">{{ t('common.back') }}</button>
        </div>
        <AccountDetail v-else ref="detailRef" :public-id="publicId" :tab="activeTab" @not-found="notFound = true" @select-tab="selectTab" />
    </AppPageShell>
</template>

<style scoped>
.account-page__tabs {
    width: 100%;
    max-width: 100%;
    margin-top: 16px;
    margin-left: 0;
    justify-content: flex-start;
    flex-wrap: wrap;
}

.account-page__not-found {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.account-page__back {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}
</style>
