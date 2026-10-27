<script setup lang="ts">
/**
 * Fiche de lecture d’une dette entre amis : contrepartie, montants, dates, transaction liée.
 * Les actions (rembourser, modifier, annuler, supprimer) ne sont proposées qu’au créancier.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { UserPhotoAvatar } from '@/features/friends';
import { useUserSettingsStore } from '@/features/user-settings';
import {
    canCancelSharedDebt,
    canDeleteSharedDebt,
    canEditSharedDebt,
    canSettleSharedDebt,
    counterpartLabel,
    formatCalendarDate,
    formatSharedDebtAmount,
    isSharedDebtOverdue
} from '@/features/shared-debts/format';
import { useSharedDebtsStore } from '@/features/shared-debts/stores/shared-debts-store';
import type { SharedDebt } from '@/features/shared-debts/types';

const props = defineProps<{
    modelValue: boolean;
    sharedDebt?: SharedDebt | null;
    /** Index `userPublicId → surnom` pour le libellé de la contrepartie. */
    nicknameMap?: ReadonlyMap<string, string> | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    settle: [debt: SharedDebt];
    edit: [debt: SharedDebt];
    cancel: [debt: SharedDebt];
    delete: [debt: SharedDebt];
}>();

const { t, locale } = useI18n();
const store = useSharedDebtsStore();
const settings = useUserSettingsStore();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const liveDebt = computed(() => {
    const id = props.sharedDebt?.publicId;
    if (!id) return props.sharedDebt ?? null;
    return store.findByPublicId(id) ?? props.sharedDebt ?? null;
});

const today = computed(() => todayYmdInTimeZone(settings.current.timezone));

const counterpartName = computed(() => (liveDebt.value ? counterpartLabel(liveDebt.value, props.nicknameMap) : ''));

const overdue = computed(() => !!liveDebt.value && isSharedDebtOverdue(liveDebt.value, today.value));

const statusText = computed(() => {
    const debt = liveDebt.value;
    if (!debt) return '';
    if (overdue.value) return t('sharedDebtsPage.statuses.overdue');
    return t(`sharedDebtsPage.statuses.${debt.status}`);
});

const linkedTransactionText = computed(() => {
    const debt = liveDebt.value;
    if (!debt?.transactionPublicId) return t('sharedDebtsPage.detail.noTransaction');
    const known = store.expenseCandidates.find((tx) => tx.publicId === debt.transactionPublicId);
    return known?.label ?? t('sharedDebtsPage.detail.linkedTransaction');
});

function money(amount: number): string {
    const debt = liveDebt.value;
    return debt ? formatSharedDebtAmount(amount, debt.currency, locale.value) : '';
}

function timestamp(value: string | null): string {
    if (!value) return t('common.emptyValue');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const rows = computed(() => {
    const debt = liveDebt.value;
    if (!debt) return [];
    const list: { key: string; label: string; value: string; tone?: string; strong?: boolean }[] = [
        { key: 'role', label: t('sharedDebtsPage.detail.role'), value: t(`sharedDebtsPage.roles.${debt.role}`) },
        { key: 'label', label: t('sharedDebtsPage.detail.label'), value: debt.label },
        { key: 'amount', label: t('sharedDebtsPage.detail.amount'), value: money(debt.amount) },
        { key: 'repaid', label: t('sharedDebtsPage.detail.repaid'), value: money(debt.repaidAmount) },
        {
            key: 'remaining',
            label: t('sharedDebtsPage.detail.remaining'),
            value: money(debt.remainingAmount),
            strong: true,
            tone: debt.role === 'creditor' && debt.remainingAmount > 0 ? 'su-pos' : ''
        },
        { key: 'status', label: t('sharedDebtsPage.detail.status'), value: statusText.value, tone: overdue.value ? 'su-over' : '' },
        {
            key: 'dueDate',
            label: t('sharedDebtsPage.detail.dueDate'),
            value: debt.dueDate ? formatCalendarDate(debt.dueDate, locale.value) : t('sharedDebtsPage.list.noDueDate'),
            tone: overdue.value ? 'su-over' : ''
        },
        { key: 'createdAt', label: t('sharedDebtsPage.detail.createdAt'), value: timestamp(debt.createdAt) },
        { key: 'updatedAt', label: t('sharedDebtsPage.detail.updatedAt'), value: timestamp(debt.updatedAt) },
        { key: 'settledAt', label: t('sharedDebtsPage.detail.settledAt'), value: timestamp(debt.settledAt) }
    ];
    if (debt.role === 'creditor') {
        list.push({ key: 'transaction', label: t('sharedDebtsPage.detail.transaction'), value: linkedTransactionText.value });
    }
    return list;
});

const showSettle = computed(() => !!liveDebt.value && canSettleSharedDebt(liveDebt.value));
const showEdit = computed(() => !!liveDebt.value && canEditSharedDebt(liveDebt.value));
const showCancel = computed(() => !!liveDebt.value && canCancelSharedDebt(liveDebt.value));
const showDelete = computed(() => !!liveDebt.value && canDeleteSharedDebt(liveDebt.value));
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="liveDebt?.label || t('sharedDebtsPage.detail.title')"
        :subtitle="liveDebt ? t(`sharedDebtsPage.detail.subtitle.${liveDebt.role}`, { name: counterpartName }) : undefined"
        :max-width="600"
        :height="680"
        scrollable
        mobile-layout="fullscreen"
    >
        <div v-if="liveDebt" class="shared-debt-detail">
            <div class="shared-debt-detail__person">
                <UserPhotoAvatar
                    :photo-url="liveDebt.counterpart.profilePicture"
                    :user-public-id="liveDebt.counterpart.publicId"
                    :fallback-label="counterpartName"
                    :size="48"
                />
                <div class="shared-debt-detail__identity">
                    <p class="shared-debt-detail__name">{{ counterpartName }}</p>
                    <p v-if="liveDebt.counterpart.username" class="shared-debt-detail__sub">@{{ liveDebt.counterpart.username }}</p>
                </div>
            </div>

            <dl class="shared-debt-detail__rows">
                <div v-for="row in rows" :key="row.key" class="su-kv" :class="{ 'su-kv--strong': row.strong }">
                    <dt>{{ row.label }}</dt>
                    <dd :class="row.tone">{{ row.value }}</dd>
                </div>
            </dl>
        </div>

        <template #footer="{ close }">
            <button type="button" class="su-btn" :disabled="store.acting" @click="close">
                {{ t('common.close') }}
            </button>
            <template v-if="liveDebt">
                <button
                    v-if="showDelete"
                    type="button"
                    class="su-btn su-btn--danger"
                    :disabled="store.acting"
                    @click="emit('delete', liveDebt)"
                >
                    {{ t('sharedDebtsPage.actions.delete') }}
                </button>
                <button
                    v-if="showCancel"
                    type="button"
                    class="su-btn su-btn--warn"
                    :disabled="store.acting"
                    @click="emit('cancel', liveDebt)"
                >
                    {{ t('sharedDebtsPage.actions.cancel') }}
                </button>
                <button v-if="showEdit" type="button" class="su-btn" :disabled="store.acting" @click="emit('edit', liveDebt)">
                    {{ t('sharedDebtsPage.actions.edit') }}
                </button>
                <button
                    v-if="showSettle"
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="store.acting"
                    @click="emit('settle', liveDebt)"
                >
                    {{ t('sharedDebtsPage.actions.settle') }}
                </button>
            </template>
        </template>
    </AppModalBase>
</template>

<style scoped>
.shared-debt-detail {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* en-tête contrepartie : avatar rond 48 px | nom 700 + @username gris */
.shared-debt-detail__person {
    display: flex;
    align-items: center;
    gap: 14px;
}

.shared-debt-detail__identity {
    min-width: 0;
}

.shared-debt-detail__name {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.shared-debt-detail__sub {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.shared-debt-detail__rows {
    margin: 0;
    border-bottom: 1px solid var(--line);
}

.shared-debt-detail__rows dt,
.shared-debt-detail__rows dd {
    margin: 0;
}

.shared-debt-detail__rows .su-kv > dt {
    flex: none;
}

.shared-debt-detail__rows .su-kv > dd {
    min-width: 0;
    overflow-wrap: anywhere;
}

.shared-debt-detail__rows .su-pos {
    color: var(--blue-ink);
}

.shared-debt-detail__rows .su-over {
    color: var(--violet-ink);
}
</style>
