<script setup lang="ts">
/**
 * Placements : un onglet par compte `investissement` / `crypto` (sélecteur au-delà de 5 comptes),
 * positions et journal du compte courant. Compte courant = paramètre de route, sinon premier compte.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { PlusIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { useAccountsStore } from '@/features/accounts';
import {
    InvestmentAccountPicker,
    InvestmentsWorkspace,
    canWriteInvestments,
    investmentsAccountPath,
    isInvestmentAccount,
    useInvestmentsStore
} from '@/features/investments';

/** Au-delà, les onglets cèdent la place à un sélecteur. */
const MAX_ACCOUNT_TABS = 5;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const store = useInvestmentsStore();
const workspaceRef = ref<{ openCreateOperation: () => void; openCreateInstrument: () => void } | null>(null);

const investmentAccounts = computed(() => accountsStore.accounts.filter((account) => isInvestmentAccount(account)));
const useTabs = computed(() => investmentAccounts.value.length <= MAX_ACCOUNT_TABS);

const routeAccountId = computed(() => {
    const raw = route.params.accountPublicId;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' ? value.trim() : '';
});

const currentAccount = computed(() => investmentAccounts.value.find((account) => account.publicId === routeAccountId.value) ?? null);
const canWrite = computed(() => canWriteInvestments(currentAccount.value));
// `accountsStore.initialized` n'est posé que par `bootstrap()` (page Comptes) : on suit ici notre propre chargement.
const accountsLoaded = ref(accountsStore.initialized || accountsStore.accounts.length > 0);
const ready = computed(() => accountsStore.initialized || accountsLoaded.value);

const subtitle = computed(() => (currentAccount.value ? `${currentAccount.value.name} · ${currentAccount.value.currency}` : undefined));

const pickerModel = computed({
    get: () => currentAccount.value?.publicId ?? '',
    set: (value: string) => {
        if (value) void router.push(investmentsAccountPath(value));
    }
});

// Paramètre absent ou inconnu → premier compte de placement (remplace l'entrée d'historique).
watch(
    () => [ready.value, routeAccountId.value, investmentAccounts.value.map((account) => account.publicId).join('|')] as const,
    () => {
        if (!ready.value || currentAccount.value) return;
        const first = investmentAccounts.value[0];
        if (first) void router.replace(investmentsAccountPath(first.publicId));
    },
    { immediate: true }
);

if (!accountsStore.initialized) {
    void accountsStore
        .loadAccounts()
        .catch(() => undefined)
        .finally(() => {
            accountsLoaded.value = true;
        });
}

function onCreateOperation() {
    if (!canWrite.value || store.acting) return;
    workspaceRef.value?.openCreateOperation();
}

function onCreateInstrument() {
    workspaceRef.value?.openCreateInstrument();
}
</script>

<template>
    <AppPageShell :title="t('investmentsPage.title')" :subtitle="subtitle">
        <template v-if="useTabs && investmentAccounts.length" #tabs>
            <nav class="su-tabs su-tabs--links investments-tabs" :aria-label="t('investmentsPage.tabs.label')">
                <RouterLink
                    v-for="account in investmentAccounts"
                    :key="account.publicId"
                    :to="investmentsAccountPath(account.publicId)"
                    class="su-tab"
                    :class="{ 'is-active': account.publicId === currentAccount?.publicId }"
                    :aria-current="account.publicId === currentAccount?.publicId ? 'page' : undefined"
                >
                    {{ account.name }}
                </RouterLink>
            </nav>
        </template>

        <template v-if="currentAccount" #toolbar>
            <InvestmentAccountPicker v-if="!useTabs" v-model="pickerModel" :accounts="investmentAccounts" />
            <div class="su-toolbar__actions">
                <button type="button" class="su-btn" @click="onCreateInstrument">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('investmentsPage.actions.createInstrument') }}
                </button>
                <button v-if="canWrite" type="button" class="su-btn su-btn--ink" :disabled="store.acting" @click="onCreateOperation">
                    <PlusIcon :size="16" stroke-width="1.6" />
                    {{ t('investmentsPage.actions.createOperation') }}
                </button>
            </div>
        </template>

        <div v-if="!ready || (accountsStore.loadingAccounts && !investmentAccounts.length)" class="su-loading">
            <span class="su-spin" />
        </div>
        <div v-else-if="!investmentAccounts.length" class="su-empty">
            <p>{{ t('investmentsPage.empty.noAccount') }}</p>
            <RouterLink to="/app/finances/comptes" class="su-link">{{ t('investmentsPage.empty.goToAccounts') }}</RouterLink>
        </div>
        <InvestmentsWorkspace
            v-else-if="currentAccount"
            :key="currentAccount.publicId"
            ref="workspaceRef"
            :account-public-id="currentAccount.publicId"
        />
    </AppPageShell>
</template>

<style scoped>
.investments-tabs .su-tab {
    text-decoration: none;
}
</style>
