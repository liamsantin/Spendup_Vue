<script setup lang="ts">
/**
 * Fiche d’une dette entre amis. Informations sous le titre de la page.
 * Rembourser, modifier, annuler et supprimer restent des modales, seulement pour le créancier.
 */
defineOptions({ name: 'SharedDebtDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { todayYmdInTimeZone } from '@/features/accounts/format';
import { useFriendNicknameLabels, UserPhotoAvatar } from '@/features/friends';
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
import SharedDebtFormModal from '@/features/shared-debts/components/modals/SharedDebtFormModal.vue';
import SharedDebtSettleModal from '@/features/shared-debts/components/modals/SharedDebtSettleModal.vue';

const props = defineProps<{
    sharedDebtPublicId: string;
}>();

const emit = defineEmits<{
    'not-found': [];
    deleted: [];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useSharedDebtsStore();
const settings = useUserSettingsStore();
const { ensureLoaded: ensureNicknames, nicknameByUserId } = useFriendNicknameLabels();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);
const settleOpen = ref(false);
const cancelOpen = ref(false);
const deleteOpen = ref(false);

const debt = computed(() => store.findByPublicId(props.sharedDebtPublicId));
const today = computed(() => todayYmdInTimeZone(settings.current.timezone));
const overdue = computed(() => !!debt.value && isSharedDebtOverdue(debt.value, today.value));
const counterpartName = computed(() => (debt.value ? counterpartLabel(debt.value, nicknameByUserId.value) : ''));

const money = (amount: number) => (debt.value ? formatSharedDebtAmount(amount, debt.value.currency, locale.value) : '');

function timestamp(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const figures = computed(() => {
    const current = debt.value;
    if (!current) return [];
    return [
        { id: 'remaining', label: t('debtsPage.detail.figs.remaining'), value: money(current.remainingAmount), note: null },
        { id: 'amount', label: t('debtsPage.detail.figs.amount'), value: money(current.amount), note: null },
        { id: 'repaid', label: t('debtsPage.detail.figs.repaid'), value: money(current.repaidAmount), note: null }
    ];
});

type Fact = { id: string; label: string; value: string; tone?: string };

const facts = computed<Fact[]>(() => {
    const current = debt.value;
    if (!current) return [];
    const list: Fact[] = [];
    const add = (id: string, label: string, value: string | null | undefined, tone?: string) => {
        const text = value?.trim();
        if (text) list.push({ id, label, value: text, tone });
    };
    add('role', t('sharedDebtsPage.detail.role'), t(`sharedDebtsPage.roles.${current.role}`));
    add(
        'status',
        t('sharedDebtsPage.detail.status'),
        overdue.value ? t('sharedDebtsPage.statuses.overdue') : t(`sharedDebtsPage.statuses.${current.status}`),
        overdue.value ? 'su-over' : undefined
    );
    add(
        'due',
        t('sharedDebtsPage.detail.dueDate'),
        current.dueDate ? formatCalendarDate(current.dueDate, locale.value) : t('sharedDebtsPage.list.noDueDate'),
        overdue.value ? 'su-over' : undefined
    );
    add('created', t('sharedDebtsPage.detail.createdAt'), timestamp(current.createdAt));
    add('updated', t('sharedDebtsPage.detail.updatedAt'), timestamp(current.updatedAt));
    add('settled', t('sharedDebtsPage.detail.settledAt'), timestamp(current.settledAt));
    if (current.role === 'creditor') {
        const known = store.expenseCandidates.find((tx) => tx.publicId === current.transactionPublicId);
        add(
            'transaction',
            t('sharedDebtsPage.detail.transaction'),
            current.transactionPublicId
                ? (known?.label ?? t('sharedDebtsPage.detail.linkedTransaction'))
                : t('sharedDebtsPage.detail.noTransaction')
        );
    }
    return list;
});

async function loadDebt() {
    const id = props.sharedDebtPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await store.fetchSharedDebt(id, true);
        if (!fresh) emit('not-found');
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        store.clearError();
        if (err.status === 404) {
            emit('not-found');
            return;
        }
        localError.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    void loadDebt();
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void ensureNicknames().catch(() => undefined);
    unsubscribeDeleted = store.subscribeToDeleted((id) => {
        if (id !== props.sharedDebtPublicId) return;
        emit('not-found');
    });
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted?.();
});

watch(
    () => props.sharedDebtPublicId,
    () => {
        editOpen.value = false;
        settleOpen.value = false;
        cancelOpen.value = false;
        deleteOpen.value = false;
        void loadDebt();
    },
    { immediate: true }
);

watch(
    () => [debt.value?.publicId, route.query.edit] as const,
    ([id, edit]) => {
        if (edit !== '1' || !id || !debt.value || !canEditSharedDebt(debt.value)) return;
        editOpen.value = true;
        const query = { ...route.query };
        delete query.edit;
        void router.replace({ path: route.path, query });
    }
);

function openEdit() {
    if (!debt.value || !canEditSharedDebt(debt.value)) return;
    editOpen.value = true;
}

function openSettle() {
    if (!debt.value || !canSettleSharedDebt(debt.value)) return;
    settleOpen.value = true;
}

function openCancel() {
    if (!debt.value || !canCancelSharedDebt(debt.value)) return;
    cancelOpen.value = true;
}

function openDelete() {
    if (!debt.value || !canDeleteSharedDebt(debt.value)) return;
    deleteOpen.value = true;
}

async function confirmCancel() {
    const current = debt.value;
    if (!current) return;
    localError.value = null;
    try {
        await store.cancelSharedDebt(current.publicId);
        cancelOpen.value = false;
        await loadDebt();
    } catch (e: unknown) {
        cancelOpen.value = false;
        const err = AppError.fromUnknown(e);
        if (err.status === 404) emit('not-found');
        else localError.value = getErrorMessage(e);
    }
}

async function confirmDelete() {
    const current = debt.value;
    if (!current) return;
    localError.value = null;
    try {
        await store.deleteSharedDebt(current.publicId);
        deleteOpen.value = false;
        emit('deleted');
    } catch (e: unknown) {
        deleteOpen.value = false;
        const err = AppError.fromUnknown(e);
        if (err.status === 404) emit('not-found');
        else localError.value = getErrorMessage(e);
    }
}

defineExpose({ openEdit, openSettle, openCancel, openDelete, reload: loadDebt });
</script>

<template>
    <div class="debt-detail">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link debt-detail__retry" @click="loadDebt">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!debt && loading" class="su-loading" :aria-label="t('debtsPage.loading')">
            <span class="su-spin" />
        </div>

        <template v-else-if="debt">
            <div class="debt-detail__info">
                <div class="debt-detail__person">
                    <UserPhotoAvatar
                        :photo-url="debt.counterpart.profilePicture"
                        :user-public-id="debt.counterpart.publicId"
                        :fallback-label="counterpartName"
                        :size="48"
                    />
                    <div class="debt-detail__identity">
                        <p class="debt-detail__name">{{ counterpartName }}</p>
                        <p v-if="debt.counterpart.username" class="debt-detail__sub">@{{ debt.counterpart.username }}</p>
                    </div>
                </div>

                <div class="su-figs debt-detail__figs" role="group" :aria-label="t('debtsPage.detail.figs.label')">
                    <div v-for="fig in figures" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="{ 'is-loading': loading }">{{ fig.value }}</p>
                    </div>
                </div>

                <div v-if="facts.length" class="debt-detail__sheet">
                    <div v-for="fact in facts" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span :class="fact.tone">{{ fact.value }}</span>
                    </div>
                </div>
            </div>

            <SharedDebtFormModal v-model="editOpen" :shared-debt="debt" @saved="loadDebt" />
            <SharedDebtSettleModal v-model="settleOpen" :shared-debt="debt" />
            <AppConfirmationModal
                v-model="cancelOpen"
                :title="t('sharedDebtsPage.cancelModal.title')"
                :message="t('sharedDebtsPage.cancelModal.body')"
                :confirm-label="t('sharedDebtsPage.actions.cancel')"
                confirm-color="warning"
                :loading="store.acting"
                @confirm="confirmCancel"
            />
            <AppConfirmationModal
                v-model="deleteOpen"
                :title="t('sharedDebtsPage.deleteModal.title')"
                :message="t('sharedDebtsPage.deleteModal.body')"
                :confirm-label="t('sharedDebtsPage.actions.delete')"
                confirm-color="error"
                :loading="store.acting"
                @confirm="confirmDelete"
            />
        </template>
    </div>
</template>

<style scoped>
.debt-detail {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
    padding: 8px 0 24px;
}

.debt-detail__info {
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
}

.debt-detail__person {
    display: flex;
    align-items: center;
    gap: 14px;
}

.debt-detail__identity {
    min-width: 0;
}

.debt-detail__name {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.debt-detail__sub {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.debt-detail__figs {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.debt-detail__figs .su-fig__num {
    font-size: 26px;
    white-space: normal;
    overflow-wrap: anywhere;
}

.debt-detail__figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.debt-detail__sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 64px;
}

.debt-detail__sheet .su-kv:nth-child(-n + 2) {
    border-top: 0;
    padding-top: 0;
}

.debt-detail__sheet .su-over {
    color: var(--violet-ink);
}

.debt-detail__retry {
    margin-left: 8px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

@media (max-width: 767px) {
    .debt-detail {
        gap: 24px;
        padding: 0 0 16px;
    }

    .debt-detail__sheet {
        grid-template-columns: minmax(0, 1fr);
    }

    .debt-detail__sheet .su-kv:nth-child(2) {
        border-top: 1px solid var(--line);
        padding-top: 12px;
    }

    .debt-detail__figs .su-fig__num {
        font-size: 22px;
    }
}
</style>
