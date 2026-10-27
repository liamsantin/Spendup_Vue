<script setup lang="ts">
/**
 * Ligne `su-person` d’une dette entre amis : avatar de l’ami, nom 700 + sous-ligne
 * (libellé · date · échéance), statut en toutes lettres, montant restant 700
 * (« +X » bleu côté créancier, « −X » noir côté débiteur). Menu d’actions côté créancier seulement.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { BanIcon, CashIcon, DotsIcon, PencilIcon, TrashIcon } from 'vue-tabler-icons';
import { UserPhotoAvatar } from '@/features/friends';
import {
    canCancelSharedDebt,
    canDeleteSharedDebt,
    canEditSharedDebt,
    canSettleSharedDebt,
    counterpartLabel,
    formatCalendarDate,
    formatSignedSharedDebtAmount,
    isOpenSharedDebt,
    isSharedDebtOverdue
} from '@/features/shared-debts/format';
import type { SharedDebt } from '@/features/shared-debts/types';

const props = defineProps<{
    sharedDebt: SharedDebt;
    /** Date civile du jour (fuseau des settings) pour l’échéance dépassée. */
    today: string;
    nicknameMap?: ReadonlyMap<string, string> | null;
    acting?: boolean;
}>();

const emit = defineEmits<{
    open: [debt: SharedDebt];
    settle: [debt: SharedDebt];
    edit: [debt: SharedDebt];
    cancel: [debt: SharedDebt];
    delete: [debt: SharedDebt];
}>();

const { t, locale } = useI18n();

const name = computed(() => counterpartLabel(props.sharedDebt, props.nicknameMap));
const overdue = computed(() => isSharedDebtOverdue(props.sharedDebt, props.today));
const closed = computed(() => !isOpenSharedDebt(props.sharedDebt));

const subline = computed(() => {
    const debt = props.sharedDebt;
    const parts = [debt.label, formatCalendarDate(debt.createdAt, locale.value)];
    if (debt.dueDate) parts.push(t('sharedDebtsPage.list.dueOn', { date: formatCalendarDate(debt.dueDate, locale.value) }));
    return parts.filter(Boolean).join(' · ');
});

const statusText = computed(() => {
    if (overdue.value) return t('sharedDebtsPage.statuses.overdue');
    return t(`sharedDebtsPage.statuses.${props.sharedDebt.status}`);
});

const amountText = computed(() => {
    const debt = props.sharedDebt;
    const amount = closed.value ? debt.amount : debt.remainingAmount;
    return formatSignedSharedDebtAmount(amount, debt.role, debt.currency, locale.value);
});

const amountTone = computed(() => {
    if (closed.value) return 'shared-debt-row__amount--closed';
    return props.sharedDebt.role === 'creditor' ? 'su-pos' : 'su-neg';
});

const showSettle = computed(() => canSettleSharedDebt(props.sharedDebt));
const showEdit = computed(() => canEditSharedDebt(props.sharedDebt));
const showCancel = computed(() => canCancelSharedDebt(props.sharedDebt));
const showDelete = computed(() => canDeleteSharedDebt(props.sharedDebt));
const hasMenu = computed(() => showSettle.value || showEdit.value || showCancel.value || showDelete.value);

function onActivate(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open', props.sharedDebt);
}
</script>

<template>
    <article
        class="su-person shared-debt-row"
        :class="{ 'is-closed': closed }"
        :data-shared-debt-id="sharedDebt.publicId"
        role="button"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="emit('open', sharedDebt)"
    >
        <UserPhotoAvatar
            :photo-url="sharedDebt.counterpart.profilePicture"
            :user-public-id="sharedDebt.counterpart.publicId"
            :fallback-label="name"
            :size="36"
        />
        <span class="su-person__meta">
            <span class="su-person__name">{{ name }}</span>
            <span class="su-person__sub">{{ subline }}</span>
        </span>
        <span class="shared-debt-row__status" :class="{ 'su-over': overdue }">{{ statusText }}</span>
        <span class="su-person__amount shared-debt-row__amount" :class="amountTone">{{ amountText }}</span>
        <span v-if="hasMenu" class="su-person__actions" @click.stop>
            <v-menu location="bottom end" :offset="4">
                <template #activator="{ props: menuProps }">
                    <button v-bind="menuProps" type="button" class="su-orb" :disabled="acting" :aria-label="t('common.more')">
                        <DotsIcon :size="18" stroke-width="1.75" />
                    </button>
                </template>
                <v-sheet class="su-menu shared-debt-menu">
                    <button v-if="showSettle" type="button" class="su-menu-item" :disabled="acting" @click="emit('settle', sharedDebt)">
                        <span class="su-menu-item__icon"><CashIcon :size="18" stroke-width="1.6" /></span>
                        <span class="su-menu-item__title">{{ t('sharedDebtsPage.actions.settle') }}</span>
                    </button>
                    <button v-if="showEdit" type="button" class="su-menu-item" :disabled="acting" @click="emit('edit', sharedDebt)">
                        <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                        <span class="su-menu-item__title">{{ t('sharedDebtsPage.actions.edit') }}</span>
                    </button>
                    <button v-if="showCancel" type="button" class="su-menu-item" :disabled="acting" @click="emit('cancel', sharedDebt)">
                        <span class="su-menu-item__icon"><BanIcon :size="18" stroke-width="1.6" /></span>
                        <span class="su-menu-item__title">{{ t('sharedDebtsPage.actions.cancel') }}</span>
                    </button>
                    <button
                        v-if="showDelete"
                        type="button"
                        class="su-menu-item shared-debt-menu__delete"
                        :disabled="acting"
                        @click="emit('delete', sharedDebt)"
                    >
                        <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                        <span class="su-menu-item__title">{{ t('sharedDebtsPage.actions.delete') }}</span>
                    </button>
                </v-sheet>
            </v-menu>
        </span>
    </article>
</template>

<style scoped>
.shared-debt-row {
    min-height: 60px;
}

.shared-debt-row:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
}

/* dette close (remboursée / annulée) : la ligne s’efface, le statut reste lisible */
.shared-debt-row.is-closed .su-person__name,
.shared-debt-row.is-closed .su-person__sub {
    opacity: 0.55;
}

.shared-debt-row__status {
    flex: none;
    width: 150px;
    color: var(--gray);
    font-size: 13px;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.shared-debt-row__status.su-over {
    color: var(--violet-ink);
}

.shared-debt-row__amount {
    min-width: 120px;
    font-size: 14px;
}

.shared-debt-row__amount--closed {
    color: var(--gray);
    font-weight: 400;
}

.shared-debt-row > .su-person__actions {
    width: 40px;
    justify-content: flex-end;
}

.shared-debt-menu {
    width: min(240px, calc(100vw - 32px));
}

.shared-debt-menu .su-menu-item:disabled {
    opacity: 0.45;
    cursor: default;
}

.shared-debt-menu .su-menu-item__icon--danger {
    background: var(--danger-soft);
    color: var(--danger);
}

.shared-debt-menu__delete .su-menu-item__title {
    color: var(--danger);
}

@media (max-width: 767px) {
    .shared-debt-row {
        flex-wrap: wrap;
        row-gap: 6px;
    }

    .shared-debt-row > .su-person__meta {
        flex-basis: calc(100% - 36px - 14px - 40px - 14px);
    }

    .shared-debt-row__status {
        order: 10;
        width: auto;
        flex: 1 1 auto;
        text-align: left;
        padding-left: 50px;
    }

    .shared-debt-row__amount {
        order: 11;
        min-width: 0;
    }
}
</style>
