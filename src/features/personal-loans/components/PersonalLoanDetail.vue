<script setup lang="ts">
/**
 * Fiche d’un prêt entre personnes. Informations (montants, sens, contrepartie) sous le titre.
 * La modification reste dans `PersonalLoanFormModal`.
 */
defineOptions({ name: 'PersonalLoanDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { formatCalendarDate, formatPercentRepaid, formatPersonalLoanAmount } from '@/features/personal-loans/format';
import { usePersonalLoansStore } from '@/features/personal-loans/stores/personal-loans-store';
import PersonalLoanFormModal from '@/features/personal-loans/components/modals/PersonalLoanFormModal.vue';

const props = defineProps<{
    loanPublicId: string;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePersonalLoansStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);

const loan = computed(() => store.findByPublicId(props.loanPublicId));

const money = (amount: number) => (loan.value ? formatPersonalLoanAmount(amount, loan.value.currency, locale.value) : '');

const figures = computed(() => {
    const current = loan.value;
    if (!current) return [];
    return [
        {
            id: 'remaining',
            label: t('debtsPage.detail.figs.remaining'),
            value: money(current.remainingAmount),
            note: t('personalLoansPage.list.repaidPercent', { percent: formatPercentRepaid(current.percentRepaid, locale.value) })
        },
        { id: 'initial', label: t('debtsPage.detail.figs.initial'), value: money(current.initialAmount), note: null },
        { id: 'repaid', label: t('debtsPage.detail.figs.repaid'), value: money(current.repaidAmount), note: null }
    ];
});

type Fact = { id: string; label: string; value: string };

const facts = computed<Fact[]>(() => {
    const current = loan.value;
    if (!current) return [];
    const list: Fact[] = [];
    const add = (id: string, label: string, value: string | null | undefined) => {
        const text = value?.trim();
        if (text) list.push({ id, label, value: text });
    };
    const field = (key: string) => t(`personalLoansPage.form.fields.${key}`);
    add('direction', field('direction'), t(`personalLoansPage.directions.${current.direction}`));
    add('counterpart', field('counterpart'), current.counterpartName || t('personalLoansPage.list.unknownCounterpart'));
    if (current.startDate) add('start', field('startDate'), formatCalendarDate(current.startDate, locale.value));
    if (current.plannedEndDate) add('end', field('plannedEndDate'), formatCalendarDate(current.plannedEndDate, locale.value));
    add('currency', field('currency'), current.currency);
    add(
        'status',
        t('debtsPage.filters.status'),
        current.status === 'active' ? t('personalLoansPage.statuses.active') : t(`personalLoansPage.badges.${current.status}`)
    );
    return list;
});

const statusBadge = computed(() => {
    const current = loan.value;
    if (!current || current.status === 'active') {
        if (current?.isOverdue) return { text: t('personalLoansPage.badges.overdue'), tone: 'is-over' };
        return null;
    }
    if (current.status === 'rembourse') return { text: t('personalLoansPage.badges.rembourse'), tone: 'su-pos' };
    return { text: t('personalLoansPage.badges.annule'), tone: '' };
});

async function loadLoan() {
    const id = props.loanPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await store.fetchPersonalLoan(id, true);
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
    void loadLoan();
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted = store.subscribeToDeleted((id) => {
        if (id !== props.loanPublicId) return;
        emit('not-found');
    });
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted?.();
});

watch(
    () => props.loanPublicId,
    () => {
        editOpen.value = false;
        void loadLoan();
    },
    { immediate: true }
);

watch(
    () => [loan.value?.publicId, route.query.edit] as const,
    ([id, edit]) => {
        if (edit !== '1' || !id) return;
        editOpen.value = true;
        const query = { ...route.query };
        delete query.edit;
        void router.replace({ path: route.path, query });
    }
);

function openEdit() {
    if (!loan.value) return;
    editOpen.value = true;
}

defineExpose({ openEdit, reload: loadLoan });
</script>

<template>
    <div class="debt-detail">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link debt-detail__retry" @click="loadLoan">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!loan && loading" class="su-loading" :aria-label="t('debtsPage.loading')">
            <span class="su-spin" />
        </div>

        <template v-else-if="loan">
            <div class="debt-detail__info">
                <p v-if="statusBadge" class="debt-detail__status" :class="statusBadge.tone">
                    <span class="su-sq" aria-hidden="true" />
                    {{ statusBadge.text }}
                </p>

                <div class="su-figs debt-detail__figs" role="group" :aria-label="t('debtsPage.detail.figs.label')">
                    <div v-for="fig in figures" :key="fig.id" class="su-fig">
                        <p class="su-fig__label">{{ fig.label }}</p>
                        <p class="su-fig__num" :class="{ 'is-loading': loading }">{{ fig.value }}</p>
                        <p v-if="fig.note" class="su-fig__note">{{ fig.note }}</p>
                    </div>
                </div>

                <div v-if="facts.length" class="debt-detail__sheet">
                    <div v-for="fact in facts" :key="fact.id" class="su-kv">
                        <span>{{ fact.label }}</span>
                        <span>{{ fact.value }}</span>
                    </div>
                </div>

                <p v-if="loan.notes" class="debt-detail__text">{{ loan.notes }}</p>
            </div>

            <PersonalLoanFormModal v-model="editOpen" :loan="loan" @saved="loadLoan" />
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

.debt-detail__text {
    margin: 8px 0 0;
    color: var(--gray);
    font-size: 13px;
    white-space: pre-wrap;
}

.debt-detail__status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    font-weight: 700;
    --sq-color: var(--gray);
}

.debt-detail__status.su-pos {
    color: var(--blue-ink);
    --sq-color: var(--blue);
}

.debt-detail__status.is-over {
    color: var(--violet-ink);
    --sq-color: var(--violet);
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
