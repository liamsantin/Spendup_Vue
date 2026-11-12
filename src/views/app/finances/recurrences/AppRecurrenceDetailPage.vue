<script setup lang="ts">
/**
 * Fiche d’une récurrence, même structure que la fiche d’un actif : titre, actions, onglets sous le titre
 * (`?tab=informations|dues|transactions|attachments`). Chemins : `/app/finances/recurrences/{charges|revenus}/:publicId`.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, PencilIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import AppTitleTile from '@/components/shared/page-shell/AppTitleTile.vue';
import RecurringDetail from '@/features/recurring-payments/components/RecurringDetail.vue';
import { recurringTypeVisual } from '@/features/recurring-payments/components/list/recurring-icons';
import { isExpenseTemplate } from '@/features/recurring-payments/format';
import {
    RECURRENCES_PATHS,
    RECURRING_DETAIL_TABS,
    activeRecurringDetailTab,
    recurrenceFromPath,
    type RecurringDetailTab
} from '@/features/recurring-payments/paths';
import { useRecurringPaymentsStore } from '@/features/recurring-payments/stores/recurring-payments-store';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useRecurringPaymentsStore();

const detailRef = ref<{ openEdit: () => void; openLink: () => void; canEdit: boolean; canLink: boolean } | null>(null);
const notFound = ref(false);

const target = computed(() => recurrenceFromPath(route.path));
const template = computed(() => {
    void store.detailsEpoch;
    const current = target.value;
    return current ? store.getDetail(current.kind, current.publicId) : null;
});

/** Pictogramme et teinte du type, comme sur la ligne de la liste. */
const visual = computed(() => {
    const current = template.value;
    if (!current || notFound.value) return null;
    return isExpenseTemplate(current)
        ? recurringTypeVisual('expense', current.expenseType)
        : recurringTypeVisual('income', current.incomeType);
});

const title = computed(() => (notFound.value || !template.value ? t('recurrencesPage.title') : template.value.name));
const subtitle = computed(() => (target.value && !notFound.value ? t(`recurrencesPage.kinds.${target.value.kind}`) : undefined));
const activeTab = computed(() => activeRecurringDetailTab(route.query.tab));

function selectTab(tab: RecurringDetailTab) {
    if (tab === activeTab.value) return;
    const query = { ...route.query };
    if (tab === RECURRING_DETAIL_TABS[0]) delete query.tab;
    else query.tab = tab;
    void router.replace({ path: route.path, query });
}

/** Retour à la liste d’où l’on vient (charges ou revenus). */
function backToList() {
    const kind = target.value?.kind;
    void router.push(kind === 'income' ? RECURRENCES_PATHS.revenus : RECURRENCES_PATHS.charges);
}

watch(
    () => target.value?.publicId,
    () => {
        notFound.value = false;
    }
);
</script>

<template>
    <AppPageShell :key="`recurrence-${target?.publicId}`" :title="title" :subtitle="subtitle" :body-scroll="activeTab !== 'transactions'">
        <template v-if="visual" #title-icon>
            <AppTitleTile :icon="visual.icon" :tone="visual.tone" />
        </template>

        <template #actions>
            <button type="button" class="su-btn" @click="backToList">
                <ArrowLeftIcon :size="16" stroke-width="1.6" />
                {{ t('common.back') }}
            </button>
            <template v-if="!notFound && template">
                <button
                    v-if="detailRef?.canEdit"
                    type="button"
                    class="su-btn su-btn--ink"
                    :disabled="store.acting"
                    @click="detailRef?.openEdit()"
                >
                    <PencilIcon :size="16" stroke-width="1.6" />
                    {{ t('recurrencesPage.actions.edit') }}
                </button>
            </template>
        </template>

        <template #hero-extra>
            <nav
                v-if="!notFound && target"
                class="su-tabs su-tabs--links recurrence-page__tabs"
                :aria-label="t('recurrencesPage.detail.tabs.label')"
            >
                <button
                    v-for="tab in RECURRING_DETAIL_TABS"
                    :key="tab"
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': activeTab === tab }"
                    :aria-current="activeTab === tab ? 'page' : undefined"
                    @click="selectTab(tab)"
                >
                    <span class="su-tab__label" :data-label="t(`recurrencesPage.detail.tabs.${tab}`)">{{
                        t(`recurrencesPage.detail.tabs.${tab}`)
                    }}</span>
                </button>
            </nav>
        </template>

        <div v-if="notFound || !target" class="su-empty recurrence-page__not-found">
            <p>{{ t('recurrencesPage.errors.notFound') }}</p>
            <button type="button" class="su-link recurrence-page__back" @click="backToList">
                {{ t('recurrencesPage.detail.backToList') }}
            </button>
        </div>
        <RecurringDetail
            v-else
            ref="detailRef"
            :kind="target.kind"
            :public-id="target.publicId"
            :tab="activeTab"
            @not-found="notFound = true"
        />
    </AppPageShell>
</template>

<style scoped>
.recurrence-page__tabs {
    width: 100%;
    max-width: 100%;
    margin-top: 16px;
    margin-left: 0;
    justify-content: flex-start;
    flex-wrap: wrap;
}

.recurrence-page__not-found {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
}

.recurrence-page__back {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
}
</style>
