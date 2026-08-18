<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { FileDescriptionIcon, Receipt2Icon, UsersIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { formatAccountBalance } from '../format';
import {
    canArchiveAccount,
    canDeleteAccount,
    canEditAccount,
    canManageShares,
    canRestoreAccount,
    canSetPrimaryAccount,
    isPrimaryActionBlocked
} from '../rights';
import { useAccountsStore } from '../stores/accounts-store';
import AccountBalanceSnapshotsPanel from './AccountBalanceSnapshotsPanel.vue';
import AccountFormModal from './AccountFormModal.vue';
import AccountSharesPanel from './AccountSharesPanel.vue';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t, locale } = useI18n();
const router = useRouter();
const store = useAccountsStore();

const editOpen = ref(false);
const archiveOpen = ref(false);
const restoreOpen = ref(false);
const deleteOpen = ref(false);
const suggestArchiveOpen = ref(false);
const localError = ref<string | null>(null);
const activeTab = ref<'details' | 'snapshots' | 'shares'>('details');

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const account = computed(() => store.selectedAccount);

const balance = computed(() =>
    account.value ? formatAccountBalance(account.value.currentBalance, account.value.currency, locale.value) : ''
);

const detailTabs = computed(() => [
    { value: 'details', label: t('comptesPage.detail.tabs.details'), icon: FileDescriptionIcon },
    { value: 'snapshots', label: t('comptesPage.detail.tabs.snapshots'), icon: Receipt2Icon },
    { value: 'shares', label: t('comptesPage.detail.tabs.shares'), icon: UsersIcon }
]);

watch(
    () => [props.modelValue, props.accountPublicId] as const,
    async ([isOpen, id]) => {
        if (!isOpen || !id) {
            if (!isOpen) store.clearSelected();
            return;
        }
        activeTab.value = 'details';
        localError.value = null;
        try {
            await store.loadAccountDetail(id);
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            localError.value = err.message;
            if (err.status === 404) {
                open.value = false;
                await router.replace({ path: '/app/finances/comptes', query: { tab: 'Accounts' } });
            }
        }
    }
);

async function onSetPrimary() {
    if (!account.value) return;
    localError.value = null;
    try {
        await store.setPrimary(account.value.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function confirmArchive() {
    if (!account.value) return;
    localError.value = null;
    try {
        await store.archiveAccount(account.value.publicId);
        archiveOpen.value = false;
        suggestArchiveOpen.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function confirmRestore() {
    if (!account.value) return;
    localError.value = null;
    try {
        await store.restoreAccount(account.value.publicId);
        restoreOpen.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function confirmDelete() {
    if (!account.value) return;
    localError.value = null;
    try {
        await store.deleteAccount(account.value.publicId);
        deleteOpen.value = false;
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        localError.value = err.message;
        deleteOpen.value = false;
        if (err.status === 400 && canArchiveAccount(account.value)) {
            suggestArchiveOpen.value = true;
        }
    }
}
</script>

<template>
    <AppModalTabs
        v-model="open"
        v-model:tab="activeTab"
        :title="account?.name || t('comptesPage.detail.title')"
        :subtitle="account ? t(`comptesPage.types.${account.type}`) : undefined"
        :tabs="detailTabs"
        :height="720"
        :max-width="640"
    >
        <div v-if="store.loadingDetail && !account" class="py-10 text-center">
            <v-progress-circular indeterminate color="primary" size="32" />
        </div>

        <AppAlert
            v-else-if="account && (localError || store.error)"
            type="error"
            class="mb-4"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <template v-if="account" #panel-details>
                    <v-row dense class="mb-4">
                        <v-col cols="12" sm="6">
                            <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.detail.currentBalance') }}</div>
                            <div class="text-h5 font-weight-bold">{{ balance }}</div>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.detail.initialBalance') }}</div>
                            <div class="text-subtitle-1">
                                {{ formatAccountBalance(account.initialBalance, account.currency, locale) }}
                            </div>
                        </v-col>
                        <v-col v-if="account.iban" cols="12">
                            <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.form.fields.iban') }}</div>
                            <div class="text-body-1">{{ account.iban }}</div>
                        </v-col>
                        <v-col v-if="account.accountNumber" cols="12">
                            <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.form.fields.accountNumber') }}</div>
                            <div class="text-body-1">{{ account.accountNumber }}</div>
                        </v-col>
                        <v-col cols="12" class="d-flex flex-wrap ga-2">
                            <v-chip v-if="account.isPrimary" size="small" color="primary" variant="tonal">
                                {{ t('comptesPage.badges.primary') }}
                            </v-chip>
                            <v-chip v-if="!account.isActive" size="small" color="warning" variant="tonal">
                                {{ t('comptesPage.badges.archived') }}
                            </v-chip>
                            <v-chip v-if="!account.isOwned" size="small" color="secondary" variant="tonal">
                                {{ t(`comptesPage.roles.${account.myRole}`) }}
                            </v-chip>
                        </v-col>
                    </v-row>

                    <div class="d-flex flex-wrap ga-2">
                        <v-btn
                            v-if="canEditAccount(account)"
                            color="primary"
                            variant="tonal"
                            size="small"
                            :disabled="store.acting"
                            @click="editOpen = true"
                        >
                            {{ t('comptesPage.actions.edit') }}
                        </v-btn>
                        <v-btn
                            v-if="canSetPrimaryAccount(account)"
                            variant="tonal"
                            size="small"
                            :disabled="store.acting"
                            @click="onSetPrimary"
                        >
                            {{ t('comptesPage.actions.setPrimary') }}
                        </v-btn>
                        <v-tooltip v-if="isPrimaryActionBlocked(account)" location="top">
                            <template #activator="{ props: tip }">
                                <div v-bind="tip">
                                    <v-btn variant="tonal" size="small" disabled>{{ t('comptesPage.actions.archive') }}</v-btn>
                                </div>
                            </template>
                            <span>{{ t('comptesPage.hints.primaryNoArchive') }}</span>
                        </v-tooltip>
                        <v-btn
                            v-else-if="canArchiveAccount(account)"
                            variant="tonal"
                            size="small"
                            :disabled="store.acting"
                            @click="archiveOpen = true"
                        >
                            {{ t('comptesPage.actions.archive') }}
                        </v-btn>
                        <v-btn
                            v-if="canRestoreAccount(account)"
                            variant="tonal"
                            size="small"
                            color="success"
                            :disabled="store.acting"
                            @click="restoreOpen = true"
                        >
                            {{ t('comptesPage.actions.restore') }}
                        </v-btn>
                        <v-tooltip v-if="isPrimaryActionBlocked(account) && account.isOwned" location="top">
                            <template #activator="{ props: tip }">
                                <div v-bind="tip">
                                    <v-btn variant="tonal" size="small" color="error" disabled>
                                        {{ t('comptesPage.actions.delete') }}
                                    </v-btn>
                                </div>
                            </template>
                            <span>{{ t('comptesPage.hints.primaryNoDelete') }}</span>
                        </v-tooltip>
                        <v-btn
                            v-else-if="canDeleteAccount(account)"
                            variant="tonal"
                            size="small"
                            color="error"
                            :disabled="store.acting"
                            @click="deleteOpen = true"
                        >
                            {{ t('comptesPage.actions.delete') }}
                        </v-btn>
                    </div>
        </template>

        <template v-if="account" #panel-snapshots>
            <AccountBalanceSnapshotsPanel :account="account" :can-write="canEditAccount(account)" />
        </template>

        <template v-if="account" #panel-shares>
            <AccountSharesPanel v-if="canManageShares(account)" :account-public-id="account.publicId" />
            <div v-else class="py-8 text-center text-medium-emphasis">
                {{ t('comptesPage.detail.shareUnavailable') }}
            </div>
        </template>

        <template #footer="{ close }">
            <v-spacer />
            <v-btn color="primary" flat @click="close">{{ t('common.close') }}</v-btn>
        </template>
    </AppModalTabs>

    <AccountFormModal v-if="account" v-model="editOpen" :account="account" />

    <AppConfirmationModal
        v-model="archiveOpen"
        :title="t('comptesPage.modals.archive.title')"
        :message="t('comptesPage.modals.archive.body')"
        :confirm-label="t('comptesPage.actions.archive')"
        :loading="store.acting"
        @confirm="confirmArchive"
    />

    <AppConfirmationModal
        v-model="restoreOpen"
        :title="t('comptesPage.modals.restore.title')"
        :message="t('comptesPage.modals.restore.body')"
        :confirm-label="t('comptesPage.actions.restore')"
        confirm-color="success"
        :loading="store.acting"
        @confirm="confirmRestore"
    />

    <AppConfirmationModal
        v-model="deleteOpen"
        :title="t('comptesPage.modals.delete.title')"
        :message="t('comptesPage.modals.delete.body')"
        :confirm-label="t('comptesPage.actions.delete')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="confirmDelete"
    />

    <AppConfirmationModal
        v-model="suggestArchiveOpen"
        :title="t('comptesPage.modals.deleteBlocked.title')"
        :message="localError || t('comptesPage.modals.deleteBlocked.body')"
        :confirm-label="t('comptesPage.actions.archive')"
        :loading="store.acting"
        @confirm="confirmArchive"
    />
</template>
