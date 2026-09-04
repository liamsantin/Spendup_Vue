<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { DotsVerticalIcon, CreditCardIcon, FileDescriptionIcon, LockIcon, Receipt2Icon, UsersIcon } from 'vue-tabler-icons';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { isAccountFieldHidden, isBalanceHidden, resolveAccountBalanceDisplay } from '@/features/accounts/format';
import {
    canArchiveAccount,
    canDeleteAccount,
    canEditAccount,
    canLeaveAccountShare,
    canManageShares,
    canRestoreAccount,
    canSetPrimaryAccount,
    canWriteBalanceSnapshots,
    isPrimaryActionBlocked
} from '@/features/accounts/rights';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import AccountBalanceSnapshotsPanel from '@/features/accounts/components/panels/AccountBalanceSnapshotsPanel.vue';
import AccountSharesPanel from '@/features/accounts/components/panels/AccountSharesPanel.vue';
import AccountFormModal from '@/features/accounts/components/modals/AccountFormModal.vue';
import { AccountPaymentMethodsPanel } from '@/features/payment-methods';

const props = defineProps<{
    modelValue: boolean;
    accountPublicId: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t, locale } = useI18n();
const { smAndDown } = useDisplay();
const router = useRouter();
const store = useAccountsStore();

const editOpen = ref(false);
const archiveOpen = ref(false);
const restoreOpen = ref(false);
const deleteOpen = ref(false);
const leaveOpen = ref(false);
const suggestArchiveOpen = ref(false);
const localError = ref<string | null>(null);
const activeTab = ref<'details' | 'snapshots' | 'paymentMethods' | 'shares'>('details');

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const account = computed(() => store.selectedAccount);

const balanceHidden = computed(() => (account.value ? isBalanceHidden(account.value) : false));

const currentBalanceDisplay = computed(() =>
    account.value
        ? resolveAccountBalanceDisplay(account.value.currentBalance, account.value.currency, balanceHidden.value, locale.value)
        : { text: '', hidden: false }
);

const initialBalanceDisplay = computed(() =>
    account.value
        ? resolveAccountBalanceDisplay(account.value.initialBalance, account.value.currency, balanceHidden.value, locale.value)
        : { text: '', hidden: false }
);

const showIban = computed(() => {
    if (!account.value) return false;
    if (isAccountFieldHidden(account.value, 'iban')) return true;
    return !!account.value.iban;
});

const showAccountNumber = computed(() => {
    if (!account.value) return false;
    if (isAccountFieldHidden(account.value, 'accountNumber')) return true;
    return !!account.value.accountNumber;
});

const detailTabs = computed(() => {
    const current = account.value;
    const canShares = !!current && canManageShares(current);
    return [
        { value: 'details' as const, label: t('comptesPage.detail.tabs.details'), icon: FileDescriptionIcon },
        {
            value: 'snapshots' as const,
            label: t('comptesPage.detail.tabs.snapshots'),
            icon: Receipt2Icon,
            disabled: balanceHidden.value,
            title: balanceHidden.value ? t('comptesPage.detail.snapshotsHiddenHint') : undefined
        },
        {
            value: 'paymentMethods' as const,
            label: t('comptesPage.detail.tabs.paymentMethods'),
            icon: CreditCardIcon
        },
        {
            value: 'shares' as const,
            label: t('comptesPage.detail.tabs.shares'),
            icon: UsersIcon,
            disabled: !canShares,
            title: !canShares ? t('comptesPage.detail.shareUnavailable') : undefined
        }
    ];
});

const hasOverflowActions = computed(() => {
    const current = account.value;
    if (!current) return false;
    return (
        isPrimaryActionBlocked(current) ||
        canArchiveAccount(current) ||
        canRestoreAccount(current) ||
        canDeleteAccount(current) ||
        canLeaveAccountShare(current)
    );
});

watch(
    () => [props.modelValue, props.accountPublicId] as const,
    async ([isOpen, id]) => {
        if (!isOpen || !id) {
            if (!isOpen) {
                store.clearSelected();
                store.clearError();
                localError.value = null;
            }
            return;
        }
        const requestedId = id;
        activeTab.value = 'details';
        localError.value = null;
        store.clearError();
        try {
            await store.loadAccountDetail(requestedId);
            // Compte / modale changés pendant l’await : ignorer le résultat.
            if (!props.modelValue || props.accountPublicId !== requestedId) return;
        } catch (e: unknown) {
            if (!props.modelValue || props.accountPublicId !== requestedId) return;
            const err = AppError.fromUnknown(e);
            localError.value = err.message;
            if (err.status === 404) {
                store.clearSelected();
                store.clearError();
                open.value = false;
                await router.replace({ path: '/app/finances/comptes', query: { tab: 'Accounts' } });
            }
        }
    }
);

watch([balanceHidden, account], () => {
    if (activeTab.value === 'snapshots' && balanceHidden.value) {
        activeTab.value = 'details';
    }
    if (activeTab.value === 'shares' && account.value && !canManageShares(account.value)) {
        activeTab.value = 'details';
    }
});

/** Ferme la modale si le compte a disparu de la liste (revoke / amitié rompue) après sync. */
watch(
    () => [props.modelValue, props.accountPublicId, store.selectedAccount, store.loadingDetail, store.accounts] as const,
    ([isOpen, id, selected, loadingDetail]) => {
        if (!isOpen || !id || loadingDetail) return;
        if (selected?.publicId === id) return;
        if (!store.accounts.some((a) => a.publicId === id)) {
            open.value = false;
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

async function confirmLeave() {
    if (!account.value) return;
    localError.value = null;
    try {
        await store.leaveShare(account.value.publicId);
        leaveOpen.value = false;
        open.value = false;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
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
        <v-progress-linear v-if="store.loadingDetail && account" indeterminate color="primary" class="mb-3 flex-shrink-0" height="2" />

        <div v-if="store.loadingDetail && !account" class="py-10 text-center">
            <span class="su-spin" />
        </div>

        <AppAlert
            v-else-if="localError || store.error"
            color="error"
            variant="tonal"
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
            <AppModalPanelScroll>
                <v-row dense class="mb-4">
                    <v-col cols="12" sm="6">
                        <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.detail.currentBalance') }}</div>
                        <div class="text-h5 font-weight-bold d-flex align-center ga-2">
                            <LockIcon v-if="currentBalanceDisplay.hidden" size="20" stroke-width="1.5" class="text-medium-emphasis" />
                            <span>{{ currentBalanceDisplay.text }}</span>
                        </div>
                        <div v-if="currentBalanceDisplay.hidden" class="text-caption text-medium-emphasis">
                            {{ t('comptesPage.detail.fieldHidden') }}
                        </div>
                    </v-col>
                    <v-col cols="12" sm="6">
                        <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.detail.initialBalance') }}</div>
                        <div class="text-subtitle-1 d-flex align-center ga-2">
                            <LockIcon v-if="initialBalanceDisplay.hidden" size="18" stroke-width="1.5" class="text-medium-emphasis" />
                            <span>{{ initialBalanceDisplay.text }}</span>
                        </div>
                    </v-col>
                    <v-col v-if="showIban" cols="12">
                        <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.form.fields.iban') }}</div>
                        <div v-if="isAccountFieldHidden(account, 'iban')" class="text-body-1 d-flex align-center ga-2 text-medium-emphasis">
                            <LockIcon size="16" stroke-width="1.5" />
                            <span>{{ t('comptesPage.detail.fieldHidden') }}</span>
                        </div>
                        <div v-else class="text-body-1">{{ account.iban }}</div>
                    </v-col>
                    <v-col v-if="showAccountNumber" cols="12">
                        <div class="text-body-2 text-medium-emphasis">{{ t('comptesPage.form.fields.accountNumber') }}</div>
                        <div
                            v-if="isAccountFieldHidden(account, 'accountNumber')"
                            class="text-body-1 d-flex align-center ga-2 text-medium-emphasis"
                        >
                            <LockIcon size="16" stroke-width="1.5" />
                            <span>{{ t('comptesPage.detail.fieldHidden') }}</span>
                        </div>
                        <div v-else class="text-body-1">{{ account.accountNumber }}</div>
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
                    <button
                        v-if="canEditAccount(account)"
                        type="button"
                        class="su-btn su-btn--ink"
                        :disabled="store.acting"
                        @click="editOpen = true"
                    >
                        {{ t('comptesPage.actions.edit') }}
                    </button>
                    <button
                        v-if="canSetPrimaryAccount(account)"
                        type="button"
                        class="su-btn"
                        :disabled="store.acting"
                        @click="onSetPrimary"
                    >
                        {{ t('comptesPage.actions.setPrimary') }}
                    </button>

                    <template v-if="!smAndDown">
                        <v-tooltip v-if="isPrimaryActionBlocked(account)" location="top">
                            <template #activator="{ props: tip }">
                                <div v-bind="tip">
                                    <button type="button" class="su-btn" disabled>{{ t('comptesPage.actions.archive') }}</button>
                                </div>
                            </template>
                            <span>{{ t('comptesPage.hints.primaryNoArchive') }}</span>
                        </v-tooltip>
                        <button
                            v-else-if="canArchiveAccount(account)"
                            type="button"
                            class="su-btn"
                            :disabled="store.acting"
                            @click="archiveOpen = true"
                        >
                            {{ t('comptesPage.actions.archive') }}
                        </button>
                        <button
                            v-if="canRestoreAccount(account)"
                            type="button"
                            class="su-btn su-btn--ink"
                            :disabled="store.acting"
                            @click="restoreOpen = true"
                        >
                            {{ t('comptesPage.actions.restore') }}
                        </button>
                        <v-tooltip v-if="isPrimaryActionBlocked(account) && account.isOwned" location="top">
                            <template #activator="{ props: tip }">
                                <div v-bind="tip">
                                    <button type="button" class="su-btn su-btn--danger" disabled>
                                        {{ t('comptesPage.actions.delete') }}
                                    </button>
                                </div>
                            </template>
                            <span>{{ t('comptesPage.hints.primaryNoDelete') }}</span>
                        </v-tooltip>
                        <button
                            v-else-if="canDeleteAccount(account)"
                            type="button"
                            class="su-btn su-btn--danger"
                            :disabled="store.acting"
                            @click="deleteOpen = true"
                        >
                            {{ t('comptesPage.actions.delete') }}
                        </button>
                        <button
                            v-if="canLeaveAccountShare(account)"
                            type="button"
                            class="su-btn su-btn--danger"
                            :disabled="store.acting"
                            @click="leaveOpen = true"
                        >
                            {{ t('comptesPage.actions.leave') }}
                        </button>
                    </template>

                    <v-menu v-else-if="hasOverflowActions" location="bottom end">
                        <template #activator="{ props: menuProps }">
                            <button v-bind="menuProps" type="button" class="su-orb" :aria-label="t('common.more')" :disabled="store.acting">
                                <DotsVerticalIcon size="18" stroke-width="1.75" />
                            </button>
                        </template>
                        <v-list density="compact" min-width="220">
                            <v-list-item
                                v-if="isPrimaryActionBlocked(account)"
                                disabled
                                :title="t('comptesPage.actions.archive')"
                                :subtitle="t('comptesPage.hints.primaryNoArchive')"
                            />
                            <v-list-item
                                v-else-if="canArchiveAccount(account)"
                                :title="t('comptesPage.actions.archive')"
                                @click="archiveOpen = true"
                            />
                            <v-list-item
                                v-if="canRestoreAccount(account)"
                                :title="t('comptesPage.actions.restore')"
                                @click="restoreOpen = true"
                            />
                            <v-list-item
                                v-if="isPrimaryActionBlocked(account) && account.isOwned"
                                disabled
                                :title="t('comptesPage.actions.delete')"
                                :subtitle="t('comptesPage.hints.primaryNoDelete')"
                            />
                            <v-list-item
                                v-else-if="canDeleteAccount(account)"
                                class="text-error"
                                :title="t('comptesPage.actions.delete')"
                                @click="deleteOpen = true"
                            />
                            <v-list-item
                                v-if="canLeaveAccountShare(account)"
                                class="text-error"
                                :title="t('comptesPage.actions.leave')"
                                @click="leaveOpen = true"
                            />
                        </v-list>
                    </v-menu>
                </div>
            </AppModalPanelScroll>
        </template>

        <template v-if="account" #panel-snapshots>
            <AccountBalanceSnapshotsPanel v-if="!balanceHidden" :account="account" :can-write="canWriteBalanceSnapshots(account)" />
        </template>

        <template v-if="account" #panel-paymentMethods>
            <AccountPaymentMethodsPanel :account="account" />
        </template>

        <template v-if="account" #panel-shares>
            <AccountSharesPanel v-if="canManageShares(account)" :account-public-id="account.publicId" />
            <div v-else class="py-8 text-center text-medium-emphasis">
                {{ t('comptesPage.detail.shareUnavailable') }}
            </div>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('common.close') }}</button>
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
        v-model="leaveOpen"
        :title="t('comptesPage.modals.leave.title')"
        :message="t('comptesPage.modals.leave.body')"
        :confirm-label="t('comptesPage.actions.leave')"
        confirm-color="error"
        :loading="store.acting"
        @confirm="confirmLeave"
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
