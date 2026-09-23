<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowsExchangeIcon, FileDescriptionIcon, LinkIcon, UnlinkIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { canLinkSavingsGoalAccount, formatCalendarDate, formatSavingsGoalAmount } from '@/features/savings-goals/format';
import { useSavingsGoalsStore } from '@/features/savings-goals/stores/savings-goals-store';
import {
    buildCreateSavingsGoalPayload,
    buildUpdateSavingsGoalPayload,
    emptySavingsGoalFormFields,
    isSavingsGoalFormDirty,
    savingsGoalToFormFields,
    type SavingsGoalFormFields,
    type SavingsGoalPayloadErrorCode
} from '@/features/savings-goals/payload';
import type { SavingsGoal } from '@/features/savings-goals/types';
import { useUserSettingsStore } from '@/features/user-settings';
import SavingsGoalForm, { type SavingsGoalFormFieldErrors } from '@/features/savings-goals/components/forms/SavingsGoalForm.vue';
import SavingsGoalLinkTransactionsModal from '@/features/savings-goals/components/modals/SavingsGoalLinkTransactionsModal.vue';

const props = defineProps<{
    modelValue: boolean;
    savingsGoal?: SavingsGoal | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [goal: SavingsGoal];
}>();

const { t, locale } = useI18n();
const store = useSavingsGoalsStore();
const accountsStore = useAccountsStore();
const settings = useUserSettingsStore();

const isEditSession = ref(false);
const editGoal = ref<SavingsGoal | null>(null);
const activeTab = ref<'details' | 'transactions'>('details');
const linkMode = ref<'link' | 'unlink'>('link');
const linkOpen = ref(false);

const isEdit = computed(() => isEditSession.value || !!props.savingsGoal);

const localError = reactive({ message: null as string | null });
const fieldErrors = reactive<SavingsGoalFormFieldErrors>({});
const form = reactive<SavingsGoalFormFields>(emptySavingsGoalFormFields());

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const liveGoal = computed(() => {
    const id = editGoal.value?.publicId;
    if (!id) return editGoal.value;
    return store.findByPublicId(id) ?? editGoal.value;
});

const linkableAccounts = computed(() => accountsStore.accounts.filter((item) => canLinkSavingsGoalAccount(item)));

const allowedAccountIds = computed(() => {
    const ids = new Set(linkableAccounts.value.map((item) => item.publicId));
    const currentId = liveGoal.value?.accountPublicId;
    if (currentId) ids.add(currentId);
    return ids;
});

const accountItems = computed(() => {
    const none = [{ title: t('savingsGoalsPage.form.noAccount'), value: '' }];
    const items = linkableAccounts.value.map((item) => ({ title: item.name, value: item.publicId }));
    const currentId = form.accountPublicId;
    if (currentId && !items.some((item) => item.value === currentId)) {
        const current = accountsStore.accounts.find((item) => item.publicId === currentId);
        if (current) items.unshift({ title: current.name, value: current.publicId });
    }
    return [...none, ...items];
});

const currencyHint = computed(() => {
    if (isEdit.value) return t('savingsGoalsPage.form.currencyLockedHint');
    return t('savingsGoalsPage.form.currencyDefaultHint', { currency: settings.current.defaultCurrency });
});

const accountChangeHint = computed(() => {
    if (!isEdit.value || !liveGoal.value) return null;
    const previous = liveGoal.value.accountPublicId;
    const next = form.accountPublicId.trim() || null;
    if (!previous && !next) return null;
    if (previous && !next) return t('savingsGoalsPage.form.detachAccountHint');
    if (previous && next && previous !== next) return t('savingsGoalsPage.form.changeAccountHint');
    return null;
});

const progressHint = computed(() => {
    const goal = liveGoal.value;
    if (!isEdit.value || !goal) return null;
    return t('savingsGoalsPage.form.progressHint', {
        contributed: formatSavingsGoalAmount(goal.contributedAmount, goal.currency, locale.value),
        current: formatSavingsGoalAmount(goal.currentAmount, goal.currency, locale.value)
    });
});

const projectedText = computed(() => {
    const goal = liveGoal.value;
    if (!goal?.projectedDate) return null;
    return t('savingsGoalsPage.form.projectedOn', { date: formatCalendarDate(goal.projectedDate, locale.value) });
});

const contributions = computed(() => liveGoal.value?.contributions ?? []);
const canLinkTransactions = computed(() => !!liveGoal.value?.accountPublicId);
const canSave = computed(() => {
    if (!isEdit.value || !editGoal.value) return true;
    return isSavingsGoalFormDirty(editGoal.value, form);
});

const modalTitle = computed(() => {
    if (!isEdit.value) return t('savingsGoalsPage.form.createTitle');
    return liveGoal.value?.name || t('savingsGoalsPage.form.editTitle');
});

const detailTabs = computed(() => [
    {
        value: 'details' as const,
        label: t('savingsGoalsPage.detail.tabs.details'),
        icon: FileDescriptionIcon
    },
    {
        value: 'transactions' as const,
        label: t('savingsGoalsPage.detail.tabs.transactions'),
        icon: ArrowsExchangeIcon,
        chip: contributions.value.length || undefined
    }
]);

function clearFieldErrors() {
    fieldErrors.name = null;
    fieldErrors.targetAmount = null;
    fieldErrors.openingAmount = null;
    fieldErrors.targetDate = null;
    fieldErrors.accountPublicId = null;
    fieldErrors.currency = null;
}

function payloadErrorText(code: SavingsGoalPayloadErrorCode): string {
    return t(`savingsGoalsPage.form.errors.${code}`);
}

function applyPayloadErrors(code: SavingsGoalPayloadErrorCode, field?: string) {
    const message = payloadErrorText(code);
    if (field && field in fieldErrors) {
        (fieldErrors as Record<string, string | null>)[field] = message;
        return;
    }
    localError.message = message;
}

function resetForm() {
    localError.message = null;
    clearFieldErrors();
    const goal = editGoal.value;
    if (goal) {
        Object.assign(form, savingsGoalToFormFields(goal));
        return;
    }
    Object.assign(
        form,
        emptySavingsGoalFormFields({
            currency: settings.current.defaultCurrency
        })
    );
}

watch(
    () => props.modelValue,
    (value) => {
        if (!value) return;
        isEditSession.value = !!props.savingsGoal;
        editGoal.value = props.savingsGoal ?? null;
        activeTab.value = 'details';
        resetForm();
        if (!accountsStore.initialized) {
            void accountsStore.loadAccounts().catch(() => undefined);
        }
    }
);

async function onSave() {
    if (isEdit.value && !canSave.value) return;
    localError.message = null;
    clearFieldErrors();
    const ctx = {
        lockedCurrency: editGoal.value?.currency ?? null,
        allowedAccountIds: allowedAccountIds.value
    };
    const built = isEdit.value ? buildUpdateSavingsGoalPayload(form, ctx) : buildCreateSavingsGoalPayload(form, ctx);
    if (!built.ok) {
        applyPayloadErrors(built.code, built.field);
        if (isEdit.value) activeTab.value = 'details';
        return;
    }
    try {
        const saved =
            isEdit.value && editGoal.value
                ? await store.updateSavingsGoal(editGoal.value.publicId, form, {
                      lockedCurrency: editGoal.value.currency,
                      allowedAccountIds: allowedAccountIds.value
                  })
                : await store.createSavingsGoal(form, { allowedAccountIds: allowedAccountIds.value });
        emit('saved', saved);
        open.value = false;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.message = t('savingsGoalsPage.errors.notFound');
            return;
        }
        localError.message = getErrorMessage(e);
    }
}

function openLink(mode: 'link' | 'unlink') {
    if (!canLinkTransactions.value) return;
    linkMode.value = mode;
    linkOpen.value = true;
}

function contributionAmount(amount: number, currency: string): string {
    return formatSavingsGoalAmount(amount, currency, locale.value);
}
</script>

<template>
    <AppModalTabs
        v-if="isEdit"
        v-model="open"
        v-model:tab="activeTab"
        :title="modalTitle"
        :subtitle="t('savingsGoalsPage.form.subtitle')"
        :tabs="detailTabs"
        :height="720"
        :max-width="640"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <template #panel-details>
            <AppModalPanelScroll>
                <SavingsGoalForm
                    :form="form"
                    :is-edit="isEdit"
                    :account-items="accountItems"
                    :field-errors="fieldErrors"
                    :currency-hint="currencyHint"
                    :account-hint="t('savingsGoalsPage.form.accountHint')"
                    :account-change-hint="accountChangeHint"
                    :progress-hint="progressHint"
                />
            </AppModalPanelScroll>
        </template>

        <template #panel-transactions>
            <AppModalPanelScroll>
                <div v-if="liveGoal" class="goal-contributions">
                    <div class="goal-contributions__head">
                        <p class="goal-contributions__hint">
                            {{
                                canLinkTransactions
                                    ? t('savingsGoalsPage.form.linkedTransactions.hint')
                                    : t('savingsGoalsPage.form.linkedTransactions.noAccount')
                            }}
                        </p>
                        <p v-if="projectedText" class="goal-contributions__hint">{{ projectedText }}</p>
                    </div>
                    <div class="goal-contributions__actions">
                        <button
                            type="button"
                            class="su-btn su-btn--tonal"
                            :disabled="!canLinkTransactions || store.acting"
                            @click="openLink('link')"
                        >
                            <LinkIcon :size="16" stroke-width="1.6" />
                            {{ t('savingsGoalsPage.form.linkedTransactions.add') }}
                        </button>
                        <button
                            type="button"
                            class="su-btn su-btn--ghost"
                            :disabled="!canLinkTransactions || store.acting || !contributions.length"
                            @click="openLink('unlink')"
                        >
                            <UnlinkIcon :size="16" stroke-width="1.6" />
                            {{ t('savingsGoalsPage.form.linkedTransactions.remove') }}
                        </button>
                    </div>
                    <p v-if="!contributions.length" class="text-caption text-medium-emphasis mb-0">
                        {{ t('savingsGoalsPage.form.linkedTransactions.empty') }}
                    </p>
                    <ul v-else class="goal-contributions__list">
                        <li v-for="item in contributions" :key="item.transactionPublicId" class="goal-contributions__row">
                            <span class="goal-contributions__meta">
                                <span class="goal-contributions__name">{{ item.label }}</span>
                                <span class="goal-contributions__sub">{{ formatCalendarDate(item.operationDate, locale) }}</span>
                            </span>
                            <span class="goal-contributions__amount" :class="{ 'is-out': item.amount < 0 }">
                                {{ contributionAmount(item.amount, liveGoal.currency) }}
                            </span>
                        </li>
                    </ul>
                </div>
            </AppModalPanelScroll>
        </template>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalTabs>

    <AppModalBase
        v-else
        v-model="open"
        :title="modalTitle"
        :subtitle="t('savingsGoalsPage.form.subtitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="localError.message" type="error" class="mb-4" closable @dismiss="localError.message = null">
            {{ localError.message }}
        </AppAlert>

        <SavingsGoalForm
            :form="form"
            :is-edit="isEdit"
            :account-items="accountItems"
            :field-errors="fieldErrors"
            :currency-hint="currencyHint"
            :account-hint="t('savingsGoalsPage.form.accountHint')"
            :account-change-hint="accountChangeHint"
            :progress-hint="progressHint"
        />

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ghost" :disabled="store.acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="store.acting || !canSave" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>

    <SavingsGoalLinkTransactionsModal v-model="linkOpen" :savings-goal="liveGoal" :mode="linkMode" />
</template>

<style scoped>
.goal-contributions {
    display: flex;
    flex-direction: column;
    min-height: 100%;
}

.goal-contributions__hint {
    margin: 0 0 8px;
    font-size: 0.8rem;
    color: var(--ink-muted);
}

.goal-contributions__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.goal-contributions__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.goal-contributions__row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    background: var(--surface-raised, var(--hair));
}

.goal-contributions__meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 1 auto;
    gap: 2px;
}

.goal-contributions__name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.goal-contributions__sub,
.goal-contributions__amount {
    font-size: 0.8rem;
    color: var(--ink-muted);
}

.goal-contributions__amount {
    flex: none;
    font-variant-numeric: tabular-nums;
}

.goal-contributions__amount.is-out {
    color: rgb(var(--v-theme-error));
}
</style>
