<script setup lang="ts">
/**
 * Onglet « Prêts » de la page Dettes : chiffres clés (je prête / j’emprunte), grille de blocs,
 * filtres lus dans la query (`status` défaut `active`, `direction`, `q`).
 * Un clic ouvre la fiche ; « Modifier » ouvre cette fiche avec la modale de formulaire.
 * `openCreate()` exposé pour le bouton Ajouter de la page.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';
import { personalLoanDetailPath } from '@/features/liabilities/paths';
import {
    LOAN_STATUS_ALL,
    formatPersonalLoanAmount,
    isLoanDirection,
    isLoanStatus,
    matchesPersonalLoanSearch
} from '@/features/personal-loans/format';
import { usePersonalLoansStore } from '@/features/personal-loans/stores/personal-loans-store';
import { PERSONAL_LOAN_LABEL_MAX, type LoanDirection, type LoanStatus, type PersonalLoan } from '@/features/personal-loans/types';
import { useUserSettingsStore } from '@/features/user-settings';
import PersonalLoanListItem from '@/features/personal-loans/components/list/PersonalLoanListItem.vue';
import PersonalLoanFormModal from '@/features/personal-loans/components/modals/PersonalLoanFormModal.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePersonalLoansStore();
const settings = useUserSettingsStore();

const createOpen = ref(false);
const deleteTarget = ref<PersonalLoan | null>(null);
const localError = ref<string | null>(null);

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

function queryString(name: string): string | null {
    const raw = route.query[name];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const filterSearch = computed(() => queryString('q')?.slice(0, PERSONAL_LOAN_LABEL_MAX) ?? null);
const filterStatus = computed<LoanStatus | null>(() => {
    const raw = queryString('status');
    if (raw === LOAN_STATUS_ALL) return null;
    return isLoanStatus(raw) ? raw : 'active';
});
const filterDirection = computed<LoanDirection | null>(() => {
    const raw = queryString('direction');
    return isLoanDirection(raw) ? raw : null;
});

const visibleItems = computed(() => {
    const needle = filterSearch.value;
    if (!needle) return store.items;
    return store.items.filter((item) => matchesPersonalLoanSearch(item, needle));
});

const totalsCurrency = computed(() => store.totalsCurrency ?? settings.current.defaultCurrency);
const figs = computed(() => [
    {
        id: 'lent',
        label: t('personalLoansPage.figs.lent'),
        value: formatPersonalLoanAmount(store.totalLent, totalsCurrency.value, locale.value),
        tone: 'su-pos'
    },
    {
        id: 'borrowed',
        label: t('personalLoansPage.figs.borrowed'),
        value: formatPersonalLoanAmount(store.totalBorrowed, totalsCurrency.value, locale.value),
        tone: ''
    }
]);

const hasExtraFilters = computed(() => !!(filterSearch.value || filterDirection.value));
const emptyCopy = computed(() => {
    if (hasExtraFilters.value) return t('personalLoansPage.empty.filtered');
    if (filterStatus.value === 'active') return t('personalLoansPage.empty.active');
    if (filterStatus.value === 'rembourse') return t('personalLoansPage.empty.rembourse');
    if (filterStatus.value === 'annule') return t('personalLoansPage.empty.annule');
    return t('personalLoansPage.empty.list');
});

const hasSearched = ref(!!filterSearch.value);
const searchRevealKey = ref(0);
const searchReveals = computed(() => hasSearched.value || !!filterSearch.value);

async function loadDirectory(force = false) {
    localError.value = null;
    try {
        await store.loadList({
            status: filterStatus.value ?? undefined,
            direction: filterDirection.value ?? undefined,
            force
        });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function onVisibilityChange() {
    if (document.visibilityState !== 'visible' || !store.initialized) return;
    void loadDirectory(true).catch(() => undefined);
}

function listQuery(): Record<string, string> {
    const next: Record<string, string> = {};
    const q = queryString('q');
    const status = queryString('status');
    const direction = queryString('direction');
    if (q) next.q = q.slice(0, PERSONAL_LOAN_LABEL_MAX);
    if (status) next.status = status;
    if (direction) next.direction = direction;
    return next;
}

function openDetail(loan: PersonalLoan, edit = false) {
    const query = listQuery();
    if (edit) query.edit = '1';
    void router.push({ path: personalLoanDetailPath(loan.publicId), query });
}

function onCreated(loan: PersonalLoan) {
    if (loan?.publicId) openDetail(loan);
}

onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    void loadDirectory().catch(() => undefined);
});

onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
});

watch(
    () => [filterStatus.value, filterDirection.value] as const,
    () => {
        void loadDirectory().catch(() => undefined);
    }
);

watch(filterSearch, (search, previousSearch) => {
    if (search) hasSearched.value = true;
    if (search !== previousSearch && (search || previousSearch)) searchRevealKey.value += 1;
});

function openCreate() {
    createOpen.value = true;
}

defineExpose({ openCreate });

function requestDelete(loan: PersonalLoan) {
    deleteTarget.value = loan;
}

async function confirmDelete() {
    if (!deleteTarget.value) return;
    localError.value = null;
    try {
        await store.deletePersonalLoan(deleteTarget.value.publicId);
        deleteTarget.value = null;
    } catch (e: unknown) {
        const err = AppError.fromUnknown(e);
        if (err.status === 404) {
            localError.value = t('personalLoansPage.errors.notFound');
            deleteTarget.value = null;
            void loadDirectory(true).catch(() => undefined);
            return;
        }
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <div>
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div class="su-figs loans-figs" role="group" :aria-label="t('personalLoansPage.figs.label')">
            <div v-for="fig in figs" :key="fig.id" class="su-fig">
                <p class="su-fig__label">{{ fig.label }}</p>
                <p class="su-fig__num" :class="[fig.tone, { 'is-loading': store.loading && !store.initialized }]">{{ fig.value }}</p>
                <p class="su-fig__note">{{ t('personalLoansPage.figs.note') }}</p>
            </div>
        </div>

        <div v-if="store.loading && !store.items.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <div
            v-else-if="!visibleItems.length"
            :key="`empty-${searchRevealKey}`"
            class="su-empty"
            :class="{ 'is-search-reveal': searchReveals }"
        >
            <p>{{ emptyCopy }}</p>
        </div>
        <div v-else class="loans-directory">
            <div :key="searchRevealKey" class="loans-directory__list" :class="{ 'is-search-reveal': searchReveals }">
                <PersonalLoanListItem
                    v-for="(loan, index) in visibleItems"
                    :key="loan.publicId"
                    :loan="loan"
                    :acting="store.acting"
                    :style="{ '--i': index }"
                    @open="openDetail"
                    @edit="openDetail($event, true)"
                    @delete="requestDelete"
                />
            </div>
        </div>

        <PersonalLoanFormModal v-model="createOpen" :default-direction="filterDirection" @saved="onCreated" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('personalLoansPage.deleteModal.title')"
            :message="t('personalLoansPage.deleteModal.body')"
            :confirm-label="t('personalLoansPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.loans-figs {
    margin: 8px 0 32px;
}

.loans-figs .su-fig__num.is-loading {
    opacity: 0.35;
}

.loans-figs .su-fig__num.su-pos {
    color: var(--blue-ink);
}

.loans-directory {
    width: 100%;
    min-width: 0;
    padding: 0 0 24px;
}

/* trois blocs par rangée (1 sur mobile), gouttière 32 px */
.loans-directory__list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px 32px;
    width: 100%;
}

@media (max-width: 1199.98px) {
    .loans-directory__list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .loans-figs {
        margin: 0 0 24px;
    }

    .loans-directory {
        padding: 0 0 16px;
    }

    .loans-directory__list {
        grid-template-columns: minmax(0, 1fr);
        gap: 32px;
    }
}
</style>
