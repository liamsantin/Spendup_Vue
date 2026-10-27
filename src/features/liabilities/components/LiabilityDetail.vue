<script setup lang="ts">
/**
 * Fiche d’un passif. L’onglet Informations (seul, sous le titre de la page) porte les montants
 * et les caractéristiques. Modifier et « restant dû » restent des modales.
 */
defineOptions({ name: 'LiabilityDetail' });

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { useAssetsStore } from '@/features/assets';
import { formatCalendarDate, formatInterestRate, formatLiabilityAmount, formatPercentRepaid } from '@/features/liabilities/format';
import { useLiabilitiesStore } from '@/features/liabilities/stores/liabilities-store';
import LiabilityFormModal from '@/features/liabilities/components/modals/LiabilityFormModal.vue';
import LiabilityRemainingAmountModal from '@/features/liabilities/components/modals/LiabilityRemainingAmountModal.vue';

const props = defineProps<{
    liabilityPublicId: string;
}>();

const emit = defineEmits<{
    'not-found': [];
}>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useLiabilitiesStore();
const assetsStore = useAssetsStore();

const loading = ref(false);
const localError = ref<string | null>(null);
const editOpen = ref(false);
const remainingOpen = ref(false);

const liability = computed(() => store.findByPublicId(props.liabilityPublicId));

const money = (amount: number) => (liability.value ? formatLiabilityAmount(amount, liability.value.currency, locale.value) : '');

const assetName = computed(() => {
    const id = liability.value?.assetPublicId;
    if (!id) return null;
    return assetsStore.findByPublicId(id)?.name ?? t('liabilitiesPage.list.unknownAsset');
});

const figures = computed(() => {
    const current = liability.value;
    if (!current) return [];
    return [
        {
            id: 'remaining',
            label: t('debtsPage.detail.figs.remaining'),
            value: money(current.remainingAmount),
            note: t('liabilitiesPage.list.repaidPercent', { percent: formatPercentRepaid(current.percentRepaid, locale.value) })
        },
        { id: 'initial', label: t('debtsPage.detail.figs.initial'), value: money(current.initialAmount), note: null },
        { id: 'repaid', label: t('debtsPage.detail.figs.repaid'), value: money(current.repaidAmount), note: null }
    ];
});

type Fact = { id: string; label: string; value: string };

const facts = computed<Fact[]>(() => {
    const current = liability.value;
    if (!current) return [];
    const list: Fact[] = [];
    const add = (id: string, label: string, value: string | null | undefined) => {
        const text = value?.trim();
        if (text) list.push({ id, label, value: text });
    };
    const field = (key: string) => t(`liabilitiesPage.form.fields.${key}`);
    add('type', field('type'), t(`liabilitiesPage.types.${current.type}`));
    add('lender', field('lender'), current.lenderTierName);
    if (current.interestRate != null) add('rate', field('interestRate'), formatInterestRate(current.interestRate, locale.value));
    if (current.startDate) add('start', field('startDate'), formatCalendarDate(current.startDate, locale.value));
    if (current.plannedEndDate) add('end', field('plannedEndDate'), formatCalendarDate(current.plannedEndDate, locale.value));
    add('asset', field('asset'), assetName.value);
    add('currency', field('currency'), current.currency);
    add(
        'status',
        t('debtsPage.filters.status'),
        current.status === 'active' ? t('liabilitiesPage.statuses.active') : t(`liabilitiesPage.badges.${current.status}`)
    );
    return list;
});

const statusBadge = computed(() => {
    const status = liability.value?.status;
    if (status === 'rembourse') return { text: t('liabilitiesPage.badges.rembourse'), tone: 'su-pos' };
    if (status === 'annule') return { text: t('liabilitiesPage.badges.annule'), tone: '' };
    return null;
});

async function loadLiability() {
    const id = props.liabilityPublicId.trim();
    if (!id) return;
    loading.value = true;
    localError.value = null;
    try {
        const fresh = await store.fetchLiability(id, true);
        if (!fresh) {
            emit('not-found');
            return;
        }
        if (fresh.assetPublicId && !assetsStore.initialized) {
            void assetsStore.loadList({ active: true }).catch(() => undefined);
        }
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
    void loadLiability();
}

let unsubscribeDeleted: (() => void) | null = null;

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted = store.subscribeToDeleted((id) => {
        if (id !== props.liabilityPublicId) return;
        emit('not-found');
    });
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    unsubscribeDeleted?.();
});

watch(
    () => props.liabilityPublicId,
    () => {
        editOpen.value = false;
        remainingOpen.value = false;
        void loadLiability();
    },
    { immediate: true }
);

watch(
    () => [liability.value?.publicId, route.query.edit] as const,
    ([id, edit]) => {
        if (edit !== '1' || !id) return;
        editOpen.value = true;
        const query = { ...route.query };
        delete query.edit;
        void router.replace({ path: route.path, query });
    }
);

function openEdit() {
    if (!liability.value) return;
    editOpen.value = true;
}

function openRemaining() {
    if (!liability.value || liability.value.status === 'annule') return;
    remainingOpen.value = true;
}

defineExpose({ openEdit, openRemaining, reload: loadLiability });
</script>

<template>
    <div class="debt-detail">
        <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
            {{ localError }}
            <button type="button" class="su-link debt-detail__retry" @click="loadLiability">{{ t('common.retry') }}</button>
        </AppAlert>

        <div v-if="!liability && loading" class="su-loading" :aria-label="t('debtsPage.loading')">
            <span class="su-spin" />
        </div>

        <template v-else-if="liability">
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
            </div>

            <LiabilityFormModal v-model="editOpen" :liability="liability" @saved="loadLiability" />
            <LiabilityRemainingAmountModal v-model="remainingOpen" :liability="liability" />
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
