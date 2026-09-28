<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { FileImportIcon } from 'vue-tabler-icons';
import AppBoard from '@/components/shared/board/AppBoard.vue';
import { useCreateFromQuery } from '@/components/shared/board/useCreateFromQuery';
import AppChoiceList from '@/components/shared/dropdown-filter/AppChoiceList.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { useAccountsStore } from '@/features/accounts';
import {
    IMPORT_STATUSES,
    IMPORTS_PATHS,
    ImportTemplatesDirectory,
    ImportUploadModal,
    ImportsDirectory,
    importDetailPath,
    isImportStatus,
    useImportsStore
} from '@/features/imports';
import type { Import, ImportStatus } from '@/features/imports';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useImportsStore();
const accountsStore = useAccountsStore();

const uploadOpen = ref(false);

const tab = computed<'history' | 'templates'>(() => (route.path.startsWith(IMPORTS_PATHS.templates) ? 'templates' : 'history'));

function queryString(name: string): string {
    const raw = route.query[name];
    return typeof raw === 'string' ? raw : '';
}

function patchQuery(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    const status = 'status' in patch ? patch.status : queryString('status') || undefined;
    const account = 'account' in patch ? patch.account : queryString('account') || undefined;
    if (status && isImportStatus(status)) next.status = status;
    if (account) next.account = account;
    void router.replace({ path: IMPORTS_PATHS.list, query: next });
}

const filterStatus = computed({
    get: (): ImportStatus | '' => {
        const raw = queryString('status');
        return isImportStatus(raw) ? raw : '';
    },
    set: (value: string) => patchQuery({ status: value || undefined })
});

const filterAccount = computed({
    get: () => queryString('account'),
    set: (value: string) => patchQuery({ account: value || undefined })
});

const statusItems = computed(() => [
    { title: t('importsPage.filters.allStatuses'), value: '' },
    ...IMPORT_STATUSES.map((value) => ({ title: t(`importsPage.statuses.${value}`), value }))
]);

const accountItems = computed(() => [
    { title: t('importsPage.filters.allAccounts'), value: '' },
    ...accountsStore.accounts.map((account) => ({ title: account.name, value: account.publicId }))
]);

const statusLabel = computed(() =>
    filterStatus.value ? t(`importsPage.statuses.${filterStatus.value}`) : t('importsPage.filters.status')
);
const accountLabel = computed(
    () => accountsStore.accounts.find((account) => account.publicId === filterAccount.value)?.name ?? t('importsPage.filters.account')
);

function onCreate() {
    if (store.acting) return;
    uploadOpen.value = true;
}

function onCreated(item: Import) {
    void router.push(importDetailPath(item.publicId));
}

onMounted(() => {
    void accountsStore.loadAccounts().catch(() => undefined);
});

useCreateFromQuery(onCreate, () => !store.acting);
</script>

<template>
    <AppPageShell class="imports-page" :title="t('importsPage.title')" :subtitle="t('importsPage.subtitle')" :body-scroll="false">
        <template #tabs>
            <nav class="su-tabs su-tabs--links" :aria-label="t('importsPage.tabs.label')">
                <RouterLink :to="IMPORTS_PATHS.list" class="su-tab" :class="{ 'is-active': tab === 'history' }">
                    {{ t('importsPage.tabs.history') }}
                </RouterLink>
                <RouterLink :to="IMPORTS_PATHS.templates" class="su-tab" :class="{ 'is-active': tab === 'templates' }">
                    {{ t('importsPage.tabs.templates') }}
                </RouterLink>
            </nav>
        </template>

        <AppBoard>
            <template v-if="tab === 'history'" #filters>
                <AppDropdownFilter
                    :label="statusLabel"
                    :min-width="240"
                    :count="filterStatus ? 1 : 0"
                    :reset-disabled="!filterStatus"
                    close-on-content-click
                    @reset="filterStatus = ''"
                >
                    <AppChoiceList v-model="filterStatus" :items="statusItems" :label="t('importsPage.filters.status')" />
                </AppDropdownFilter>
                <AppDropdownFilter
                    v-if="accountsStore.accounts.length > 1"
                    :label="accountLabel"
                    :min-width="260"
                    :count="filterAccount ? 1 : 0"
                    :reset-disabled="!filterAccount"
                    close-on-content-click
                    @reset="filterAccount = ''"
                >
                    <AppChoiceList v-model="filterAccount" :items="accountItems" :label="t('importsPage.filters.account')" />
                </AppDropdownFilter>
            </template>
            <template #bar>
                <span v-if="tab === 'history' && store.initialized && store.totalCount" class="su-toolbar__count app-board__count">
                    {{ t('importsPage.count', { count: store.totalCount }, store.totalCount) }}
                </span>
            </template>
            <template #actions>
                <button
                    type="button"
                    class="su-btn su-btn--ink app-board__primary"
                    :disabled="store.acting"
                    :aria-label="t('importsPage.actions.create')"
                    @click="onCreate"
                >
                    <FileImportIcon :size="16" stroke-width="1.6" />
                    <span class="app-board__label">{{ t('importsPage.actions.create') }}</span>
                </button>
            </template>

            <div class="imports-page__body">
                <ImportsDirectory v-if="tab === 'history'" :status="filterStatus || null" :account-public-id="filterAccount || null" />
                <ImportTemplatesDirectory v-else />
            </div>
        </AppBoard>

        <ImportUploadModal v-model="uploadOpen" :default-account-public-id="filterAccount || null" @created="onCreated" />
    </AppPageShell>
</template>

<style scoped>
.imports-page__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 10px 12px;
    -webkit-overflow-scrolling: touch;
}

.su-tabs--links .su-tab {
    text-decoration: none;
}
</style>
