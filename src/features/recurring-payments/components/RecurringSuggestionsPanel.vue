<script setup lang="ts">
/**
 * Suggestions de récurrences `propose` d’un compte ou d’un import : créer le modèle (valeurs détectées,
 * modifiable ensuite depuis la liste des récurrences) ou ignorer définitivement.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, Receipt2Icon, TrendingUpIcon, XIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import { formatCalendarDate, formatPlannedAmount } from '@/features/recurring-payments/format';
import { useRecurringSuggestionsStore } from '@/features/recurring-payments/stores/recurring-suggestions-store';
import type { RecurringSuggestion } from '@/features/recurring-payments/types';

const props = withDefaults(
    defineProps<{
        accountPublicId?: string | null;
        importPublicId?: string | null;
        /** Masque tout le panneau (titre compris) quand il n’y a rien à proposer. */
        hideWhenEmpty?: boolean;
        /** Affiche le compte de chaque suggestion (liste multi-comptes). */
        showAccount?: boolean;
    }>(),
    { accountPublicId: null, importPublicId: null, hideWhenEmpty: false, showAccount: false }
);

const emit = defineEmits<{
    accepted: [suggestion: RecurringSuggestion];
}>();

const { t, locale } = useI18n();
const store = useRecurringSuggestionsStore();
const accountsStore = useAccountsStore();

const notice = ref<string | null>(null);
const localError = ref<string | null>(null);

const hasScope = computed(() => !!(props.accountPublicId || props.importPublicId));
const visible = computed(() => !props.hideWhenEmpty || store.hasItems);

watch(
    () => [props.accountPublicId, props.importPublicId] as const,
    ([accountPublicId, importPublicId]) => {
        notice.value = null;
        localError.value = null;
        if (!accountPublicId && !importPublicId) return;
        store.load({ accountPublicId, importPublicId }).catch((e: unknown) => {
            localError.value = getErrorMessage(e);
        });
    },
    { immediate: true }
);

function accountName(item: RecurringSuggestion): string {
    return accountsStore.accounts.find((account) => account.publicId === item.accountPublicId)?.name ?? t('recurrencesPage.unknownAccount');
}

function frequencyLabel(item: RecurringSuggestion): string {
    return t(`recurrencesPage.incomeFrequencies.${item.frequency}`);
}

function confidenceLabel(item: RecurringSuggestion): string {
    return t('recurrencesPage.suggestions.confidence', { value: Math.round(item.confidence * 100) });
}

async function onAccept(item: RecurringSuggestion) {
    notice.value = null;
    localError.value = null;
    try {
        const result = await store.accept(item.publicId);
        const name = result.recurringExpense?.name ?? result.recurringIncome?.name ?? item.suggestedName;
        notice.value = t('recurrencesPage.suggestions.accepted', { name });
        emit('accepted', result.suggestion);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function onDismiss(item: RecurringSuggestion) {
    notice.value = null;
    localError.value = null;
    try {
        await store.dismiss(item.publicId);
        notice.value = t('recurrencesPage.suggestions.dismissed');
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}
</script>

<template>
    <section v-if="visible || localError || notice" class="recurring-suggestions">
        <AppAlert v-if="localError" type="error" closable @dismiss="localError = null">{{ localError }}</AppAlert>
        <AppAlert v-if="notice" type="success" closable @dismiss="notice = null">{{ notice }}</AppAlert>

        <slot name="header" :count="store.items.length" />

        <p v-if="!hasScope" class="recurring-suggestions__empty">{{ t('recurrencesPage.suggestions.chooseAccount') }}</p>
        <p v-else-if="store.loading && !store.hasItems" class="recurring-suggestions__empty">
            {{ t('recurrencesPage.suggestions.loading') }}
        </p>
        <p v-else-if="!store.hasItems && visible" class="recurring-suggestions__empty">{{ t('recurrencesPage.suggestions.empty') }}</p>

        <ul v-if="store.hasItems" class="recurring-suggestions__list">
            <li v-for="item in store.items" :key="item.publicId" class="recurring-suggestions__item">
                <span
                    class="su-tile recurring-suggestions__icon"
                    :class="item.type === 'depense' ? 'is-expense' : 'su-tile--blue'"
                    aria-hidden="true"
                >
                    <component :is="item.type === 'depense' ? Receipt2Icon : TrendingUpIcon" :size="18" stroke-width="1.7" />
                </span>
                <div class="recurring-suggestions__meta">
                    <p class="recurring-suggestions__name">{{ item.suggestedName }}</p>
                    <p class="recurring-suggestions__sub">
                        {{ frequencyLabel(item) }} ·
                        {{ t('recurrencesPage.suggestions.occurrences', { count: item.occurrenceCount }, item.occurrenceCount) }}
                        <template v-if="showAccount"> · {{ accountName(item) }}</template>
                    </p>
                    <p class="recurring-suggestions__sub">
                        {{ t('recurrencesPage.suggestions.next', { date: formatCalendarDate(item.nextExpectedDate, locale) }) }} ·
                        {{ confidenceLabel(item) }}
                    </p>
                    <p v-if="item.label !== item.suggestedName" class="recurring-suggestions__label" :title="item.label">
                        {{ item.label }}
                    </p>
                </div>
                <div class="recurring-suggestions__actions">
                    <span class="recurring-suggestions__amount" :class="item.type === 'depense' ? 'su-neg' : 'su-pos'">
                        {{ formatPlannedAmount(item.type === 'depense' ? -item.amount : item.amount, item.currency, locale) }}
                    </span>
                    <div class="recurring-suggestions__buttons">
                        <button
                            type="button"
                            class="su-btn su-btn--sm"
                            :disabled="!!store.actingId"
                            :aria-label="t('recurrencesPage.suggestions.dismiss')"
                            @click="onDismiss(item)"
                        >
                            <XIcon :size="16" stroke-width="1.6" />
                            <span>{{ t('recurrencesPage.suggestions.dismiss') }}</span>
                        </button>
                        <button type="button" class="su-btn su-btn--sm su-btn--ink" :disabled="!!store.actingId" @click="onAccept(item)">
                            <CheckIcon :size="16" stroke-width="1.6" />
                            <span>{{ t('recurrencesPage.suggestions.accept') }}</span>
                        </button>
                    </div>
                </div>
            </li>
        </ul>
    </section>
</template>

<style scoped>
.recurring-suggestions {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.recurring-suggestions__empty {
    margin: 0;
    font-size: 14px;
    color: var(--gray);
}

/* lignes sur filets fins : 36px | nom 700 + sous-lignes grises | montant + actions */
.recurring-suggestions__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
}

.recurring-suggestions__item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.recurring-suggestions__list > .recurring-suggestions__item:first-child {
    border-top: 0;
}

.recurring-suggestions__icon.is-expense {
    background: var(--t-gray-bg);
    color: var(--ink);
}

.recurring-suggestions__meta {
    flex: 1;
    min-width: 0;
}

.recurring-suggestions__name {
    margin: 0;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recurring-suggestions__sub,
.recurring-suggestions__label {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--gray);
}

.recurring-suggestions__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recurring-suggestions__actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex: none;
}

.recurring-suggestions__amount {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.recurring-suggestions__buttons {
    display: flex;
    gap: 6px;
}

@media (max-width: 767px) {
    .recurring-suggestions__item {
        flex-wrap: wrap;
    }

    .recurring-suggestions__actions {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .recurring-suggestions__buttons .su-btn span {
        display: none;
    }
}
</style>
