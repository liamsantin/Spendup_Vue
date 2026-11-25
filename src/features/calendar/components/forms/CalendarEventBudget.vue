<script setup lang="ts">
/**
 * Budget d'un événement (phase 5) : prévu / réel avec jauge, dépenses rattachées, suggestions sur la période.
 * Chargé à l'ouverture d'un événement existant ; une absence de budget (404) affiche le formulaire d'ajout.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { calendarApi } from '@/features/calendar/api';
import { formatOccurrenceAmount } from '@/features/calendar/occurrences';
import { CALENDAR_BUDGET_TYPES, type CalendarBudgetTransaction, type CalendarEventBudget } from '@/features/calendar/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{ eventPublicId: string }>();

const { t } = useI18n();

const budget = ref<CalendarEventBudget | null>(null);
const suggestions = ref<CalendarBudgetTransaction[]>([]);
const loading = ref(true);
const acting = ref(false);
const error = ref<string | null>(null);
const editing = ref(false);
const draft = ref({ eventType: 'other', plannedBudget: '', notes: '' });

const typeItems = computed(() => CALENDAR_BUDGET_TYPES.map((value) => ({ title: t(`calendarPage.budget.types.${value}`), value })));
const barWidth = computed(() => Math.min(100, Math.max(budget.value?.percent ?? 0, budget.value && budget.value.spent > 0 ? 1 : 0)));
const planned = computed(() => Number(draft.value.plannedBudget.replace(',', '.')));
const canSaveBudget = computed(() => Number.isFinite(planned.value) && planned.value >= 0 && draft.value.plannedBudget.trim() !== '');

function money(amount: number, currency: string): string {
    return formatOccurrenceAmount(amount, currency, false);
}

async function load() {
    loading.value = true;
    error.value = null;
    try {
        budget.value = await calendarApi.eventBudget(props.eventPublicId);
        suggestions.value = (await calendarApi.budgetSuggestions(props.eventPublicId)).items;
    } catch (e) {
        if (AppError.fromUnknown(e).status === 404) budget.value = null;
        else error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

function startEdit() {
    draft.value = {
        eventType: budget.value?.eventType ?? 'other',
        plannedBudget: budget.value ? String(budget.value.plannedBudget) : '',
        notes: budget.value?.notes ?? ''
    };
    editing.value = true;
}

async function run(action: () => Promise<void>) {
    if (acting.value) return;
    acting.value = true;
    error.value = null;
    try {
        await action();
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        acting.value = false;
    }
}

function saveBudget() {
    if (!canSaveBudget.value) return;
    void run(async () => {
        budget.value = await calendarApi.setEventBudget(props.eventPublicId, {
            eventType: draft.value.eventType,
            plannedBudget: planned.value,
            ...(budget.value ? { currency: budget.value.currency } : {}),
            notes: draft.value.notes.trim()
        });
        suggestions.value = (await calendarApi.budgetSuggestions(props.eventPublicId)).items;
        editing.value = false;
    });
}

function removeBudget() {
    void run(async () => {
        await calendarApi.deleteEventBudget(props.eventPublicId);
        budget.value = null;
        suggestions.value = [];
    });
}

function attach(transaction: CalendarBudgetTransaction) {
    void run(async () => {
        budget.value = await calendarApi.attachBudgetTransaction(props.eventPublicId, transaction.publicId);
        suggestions.value = suggestions.value.filter((item) => item.publicId !== transaction.publicId);
    });
}

function detach(transaction: CalendarBudgetTransaction) {
    void run(async () => {
        budget.value = await calendarApi.detachBudgetTransaction(props.eventPublicId, transaction.publicId);
        suggestions.value = (await calendarApi.budgetSuggestions(props.eventPublicId)).items;
    });
}

onMounted(() => void load());
watch(
    () => props.eventPublicId,
    () => void load()
);
</script>

<template>
    <section class="cal-budget" :aria-label="t('calendarPage.budget.title')">
        <header class="cal-budget__head">
            <h3>{{ t('calendarPage.budget.title') }}</h3>
            <button v-if="budget && !editing" type="button" class="su-link" :disabled="acting" @click="startEdit">
                {{ t('calendarPage.budget.edit') }}
            </button>
        </header>

        <AppAlert v-if="error" type="error" class="mb-2" closable @dismiss="error = null">{{ error }}</AppAlert>
        <div v-if="loading" class="su-loading"><span class="su-spin" /></div>

        <template v-else-if="editing || !budget">
            <p v-if="!budget && !editing" class="cal-budget__hint">{{ t('calendarPage.budget.empty') }}</p>
            <button v-if="!budget && !editing" type="button" class="su-btn" @click="startEdit">{{ t('calendarPage.budget.add') }}</button>
            <div v-if="editing" class="cal-budget__form">
                <AppSelect
                    v-model="draft.eventType"
                    :items="typeItems"
                    item-title="title"
                    item-value="value"
                    :label="t('calendarPage.budget.type')"
                    hide-details
                />
                <div class="su-field">
                    <label class="su-field__label" for="cal-budget-planned">{{ t('calendarPage.budget.planned') }}</label>
                    <input
                        id="cal-budget-planned"
                        v-model="draft.plannedBudget"
                        class="su-input"
                        inputmode="decimal"
                        :placeholder="budget?.currency ?? 'CHF'"
                    />
                </div>
                <div class="cal-budget__actions">
                    <button type="button" class="su-btn" :disabled="acting" @click="editing = false">{{ t('common.cancel') }}</button>
                    <button type="button" class="su-btn su-btn--ink" :disabled="acting || !canSaveBudget" @click="saveBudget">
                        {{ t('common.save') }}
                    </button>
                </div>
            </div>
        </template>

        <template v-else-if="budget">
            <p class="cal-budget__figures">
                <strong :class="{ 'cal-budget__over': budget.exceeded }">{{ money(budget.spent, budget.currency) }}</strong>
                <span> / {{ money(budget.plannedBudget, budget.currency) }}</span>
                <span v-if="budget.percent != null" class="cal-budget__percent">{{ Math.round(budget.percent) }} %</span>
            </p>
            <span class="su-gauge" role="progressbar" :aria-valuenow="Math.round(barWidth)" aria-valuemin="0" aria-valuemax="100">
                <span
                    class="su-gauge__fill su-gauge__fill--blue"
                    :class="{ 'su-gauge__fill--over': budget.exceeded }"
                    :style="{ width: `${barWidth}%` }"
                />
            </span>
            <p class="cal-budget__hint" :class="{ 'cal-budget__over': budget.exceeded }">
                {{
                    budget.exceeded
                        ? t('calendarPage.budget.exceeded', { amount: money(Math.abs(budget.remaining), budget.currency) })
                        : t('calendarPage.budget.remaining', { amount: money(budget.remaining, budget.currency) })
                }}
            </p>

            <h4 class="cal-budget__sub">{{ t('calendarPage.budget.expenses') }}</h4>
            <p v-if="!budget.transactions.length" class="cal-budget__hint">{{ t('calendarPage.budget.noExpenses') }}</p>
            <ul v-else class="cal-budget__list">
                <li v-for="item in budget.transactions" :key="item.publicId">
                    <span class="cal-budget__date">{{ item.operationDate }}</span>
                    <span class="cal-budget__label">{{ item.label }}</span>
                    <span class="cal-budget__amount">{{ money(item.amount, item.currency) }}</span>
                    <button type="button" class="su-link" :disabled="acting" @click="detach(item)">
                        {{ t('calendarPage.budget.detach') }}
                    </button>
                </li>
            </ul>

            <template v-if="suggestions.length">
                <h4 class="cal-budget__sub">{{ t('calendarPage.budget.suggestions') }}</h4>
                <ul class="cal-budget__list">
                    <li v-for="item in suggestions.slice(0, 8)" :key="item.publicId">
                        <span class="cal-budget__date">{{ item.operationDate }}</span>
                        <span class="cal-budget__label">{{ item.label }}</span>
                        <span class="cal-budget__amount">{{ money(item.amount, item.currency) }}</span>
                        <button type="button" class="su-link" :disabled="acting" @click="attach(item)">
                            {{ t('calendarPage.budget.attach') }}
                        </button>
                    </li>
                </ul>
            </template>

            <button type="button" class="su-link cal-budget__remove" :disabled="acting" @click="removeBudget">
                {{ t('calendarPage.budget.remove') }}
            </button>
        </template>
    </section>
</template>

<style scoped>
.cal-budget {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--line, rgba(0, 0, 0, 0.1));
}

.cal-budget__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
}

.cal-budget__head h3,
.cal-budget__sub {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
}

.cal-budget__sub {
    margin-top: 16px;
}

.cal-budget__figures {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin: 0 0 6px;
    font-variant-numeric: tabular-nums;
}

.cal-budget__percent {
    margin-left: auto;
    opacity: 0.7;
}

.cal-budget__hint {
    margin: 6px 0;
    font-size: 13px;
    opacity: 0.75;
}

.cal-budget__over {
    color: var(--danger, #9b2c2c);
    opacity: 1;
}

.cal-budget__form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.cal-budget__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.cal-budget__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.cal-budget__list li {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--line, rgba(0, 0, 0, 0.1));
}

.cal-budget__date {
    min-width: 78px;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
}

.cal-budget__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-budget__amount {
    font-variant-numeric: tabular-nums;
}

.cal-budget__remove {
    margin-top: 16px;
}
</style>
