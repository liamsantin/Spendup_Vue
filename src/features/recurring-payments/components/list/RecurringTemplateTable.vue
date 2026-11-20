<script setup lang="ts">
/**
 * Liste des récurrences groupée par nature (Revenus, Charges fixes, Abonnements) :
 * en-tête de groupe = nom 700 à gauche + total 700 à droite sur filet 2 px, lignes sur filets fins.
 * Le tri reçu en prop est déjà appliqué aux `items` ; il est conservé à l’intérieur de chaque groupe.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import RecurringTemplateListItem from '@/features/recurring-payments/components/list/RecurringTemplateListItem.vue';
import {
    formatSignedPlannedAmount,
    isExpenseTemplate,
    recurringNature,
    type RecurringNature,
    type TemplateSort
} from '@/features/recurring-payments/format';
import type { RecurringExpense, RecurringIncome, RecurringKind } from '@/features/recurring-payments/types';

const GROUP_ORDER: RecurringNature[] = ['incomes', 'fixed', 'subscriptions'];

const props = withDefaults(
    defineProps<{
        items: (RecurringExpense | RecurringIncome)[];
        sort: TemplateSort;
        showKind?: boolean;
        acting?: boolean;
        canWrite: (accountPublicId: string) => boolean;
    }>(),
    { showKind: false, acting: false }
);

const emit = defineEmits<{
    open: [template: RecurringExpense | RecurringIncome];
    edit: [template: RecurringExpense | RecurringIncome];
    delete: [template: RecurringExpense | RecurringIncome];
    sort: [value: TemplateSort];
}>();

const { t, locale } = useI18n();

function kindOf(item: RecurringExpense | RecurringIncome): RecurringKind {
    return isExpenseTemplate(item) ? 'expense' : 'income';
}

type Group = {
    key: RecurringNature;
    label: string;
    kind: RecurringKind;
    items: (RecurringExpense | RecurringIncome)[];
    /** Somme des montants planifiés affichés (devise de la première ligne). */
    total: string;
};

const groups = computed<Group[]>(() => {
    const buckets = new Map<RecurringNature, (RecurringExpense | RecurringIncome)[]>();
    for (const item of props.items) {
        const nature = recurringNature(item);
        const bucket = buckets.get(nature) ?? [];
        bucket.push(item);
        buckets.set(nature, bucket);
    }
    return GROUP_ORDER.flatMap((key) => {
        const items = buckets.get(key);
        if (!items?.length) return [];
        const kind = kindOf(items[0]);
        const total = items.reduce((sum, item) => sum + item.plannedAmount, 0);
        return [
            {
                key,
                label: t(`recurrencesPage.groups.${key}`),
                kind,
                items,
                total: formatSignedPlannedAmount(total, kind, items[0].currency, locale.value)
            }
        ];
    });
});
</script>

<template>
    <div class="recurring-groups">
        <section v-for="group in groups" :key="group.key" class="recurring-group" :aria-label="group.label">
            <header class="recurring-group__head">
                <h2 class="recurring-group__title">{{ group.label }}</h2>
                <span class="recurring-group__total" :class="group.kind === 'income' ? 'su-pos' : 'su-neg'">{{ group.total }}</span>
            </header>
            <RecurringTemplateListItem
                v-for="item in group.items"
                :key="`${kindOf(item)}-${item.publicId}`"
                :template="item"
                :kind="kindOf(item)"
                :show-kind="showKind"
                :can-write="canWrite(item.accountPublicId)"
                :acting="acting"
                @open="emit('open', $event)"
                @edit="emit('edit', $event)"
                @delete="emit('delete', $event)"
            />
        </section>
    </div>
</template>

<style scoped>
.recurring-groups {
    display: flex;
    flex-direction: column;
    gap: 40px;
}

.recurring-group__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 0 0 10px;
    border-bottom: 1px solid var(--line);
}

/* le total s'aligne sur la colonne des montants (la colonne d'actions de 84 px reste à droite) */
@media (min-width: 960px) {
    .recurring-group__head {
        padding-right: calc(84px + 14px);
    }
}

.recurring-group__title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.recurring-group__total {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

/* le filet du premier élément est porté par l’en-tête de groupe */
.recurring-group > :deep(.recurring-row:first-of-type) {
    border-top: 0;
}
</style>
