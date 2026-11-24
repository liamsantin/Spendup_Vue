<script setup lang="ts">
/**
 * Champs du formulaire d'événement. `form` est détenu par le parent.
 */
/* eslint-disable vue/no-mutating-props -- shared reactive form owned by parent */
defineOptions({ name: 'CalendarEventForm' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { XIcon } from 'vue-tabler-icons';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { addDaysYmd, parseYmd } from '@/features/calendar/dates';
import { EVENT_REMINDERS_MAX, EVENT_TITLE_MAX, type CalendarEventFormFields } from '@/features/calendar/payload';
import { REPEAT_COUNT_MAX, REPEAT_PRESETS, type RepeatEnd } from '@/features/calendar/recurrence';

export type CalendarEventFormFieldErrors = Partial<Record<keyof CalendarEventFormFields, string | null>>;

const REMINDER_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];

const props = withDefaults(
    defineProps<{
        form: CalendarEventFormFields;
        isEdit: boolean;
        calendarItems: { title: string; value: string }[];
        fieldErrors?: CalendarEventFormFieldErrors;
    }>(),
    { fieldErrors: () => ({}) }
);

const { t, locale } = useI18n();

const startDay = computed(() => (props.form.startDate ? parseYmd(props.form.startDate) : null));

const repeatItems = computed(() => {
    const day = startDay.value;
    const weekday = day ? new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(day) : '';
    const dayMonth = day ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(day) : '';
    const items = REPEAT_PRESETS.map((value) => ({
        value,
        title: t(`calendarPage.form.repeat.${value}`, { day: value === 'weekly' ? weekday : (day?.getDate() ?? ''), date: dayMonth })
    }));
    return props.form.customRule ? [...items, { value: 'custom', title: t('calendarPage.form.repeat.custom') }] : items;
});

const repeatEndItems = computed(() =>
    (['never', 'until', 'count'] as RepeatEnd[]).map((value) => ({ value, title: t(`calendarPage.form.repeatEnd.${value}`) }))
);

const showsRepeatEnd = computed(() => props.form.repeat !== 'none' && props.form.repeat !== 'custom');

function reminderLabel(minutes: number): string {
    if (minutes === 0) return t('calendarPage.form.reminders.atStart');
    if (minutes % 10080 === 0) return t('calendarPage.form.reminders.weeks', { count: minutes / 10080 }, minutes / 10080);
    if (minutes % 1440 === 0) return t('calendarPage.form.reminders.days', { count: minutes / 1440 }, minutes / 1440);
    if (minutes % 60 === 0) return t('calendarPage.form.reminders.hours', { count: minutes / 60 });
    return t('calendarPage.form.reminders.minutes', { count: minutes });
}

/** Sélecteur « Ajouter un rappel » : toujours vide, il ajoute puis se remet à zéro. */
const reminderPick = ref<number | null>(null);
const reminderItems = computed(() =>
    REMINDER_CHOICES.filter((m) => !props.form.reminders.some((r) => r.beforeMinutes === m)).map((value) => ({
        value,
        title: reminderLabel(value)
    }))
);

function addReminder(minutes: number | null) {
    if (minutes == null || props.form.reminders.length >= EVENT_REMINDERS_MAX) return;
    props.form.reminders = [...props.form.reminders, { beforeMinutes: minutes, canal: 'app' }].sort(
        (a, b) => a.beforeMinutes - b.beforeMinutes
    );
    reminderPick.value = null;
}

function removeReminder(index: number) {
    props.form.reminders = props.form.reminders.filter((_, i) => i !== index);
}

/** Changer le début garde la durée ; une fin laissée avant le début suit. */
function onStartDate(value: string | null) {
    const previous = props.form.startDate;
    props.form.startDate = value;
    if (!value || !previous || !props.form.endDate) return;
    const shift = Math.round((parseYmd(value).getTime() - parseYmd(previous).getTime()) / 86_400_000);
    props.form.endDate = addDaysYmd(props.form.endDate, shift);
}

function onStartTime(value: string) {
    const [ph, pm] = props.form.startTime.split(':').map(Number);
    const [nh, nm] = value.split(':').map(Number);
    props.form.startTime = value;
    if ([ph, pm, nh, nm].some(Number.isNaN) || props.form.endDate !== props.form.startDate) return;
    const [eh, em] = props.form.endTime.split(':').map(Number);
    const end = Math.min(eh * 60 + em + (nh * 60 + nm) - (ph * 60 + pm), 23 * 60 + 59);
    if (end >= 0) props.form.endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}
</script>

<template>
    <div class="cal-form">
        <div class="cal-form__row">
            <label class="cal-form__label" for="cal-form-title">{{ t('calendarPage.form.fields.title') }} *</label>
            <div class="cal-form__field">
                <v-text-field
                    id="cal-form-title"
                    v-model="form.title"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    autofocus
                    :maxlength="EVENT_TITLE_MAX"
                    :error="!!fieldErrors.title"
                    :error-messages="fieldErrors.title || undefined"
                />
            </div>
        </div>

        <div v-if="calendarItems.length > 1" class="cal-form__row">
            <label class="cal-form__label">{{ t('calendarPage.form.fields.calendar') }}</label>
            <div class="cal-form__field">
                <AppSelect
                    id="cal-form-calendar"
                    v-model="form.calendarPublicId"
                    :items="calendarItems"
                    :label="t('calendarPage.form.fields.calendar')"
                    :disabled="isEdit"
                    hide-details="auto"
                />
            </div>
        </div>

        <div class="cal-form__row">
            <label class="cal-form__label" for="cal-form-all-day">{{ t('calendarPage.form.fields.allDay') }}</label>
            <div class="cal-form__field">
                <AppSwitch id="cal-form-all-day" v-model="form.isFullDay" :disabled="isEdit" />
                <p v-if="isEdit" class="cal-form__hint">{{ t('calendarPage.form.lockedHint') }}</p>
            </div>
        </div>

        <div class="cal-form__row">
            <label class="cal-form__label" for="cal-form-start">{{ t('calendarPage.form.fields.start') }} *</label>
            <div class="cal-form__field cal-form__when">
                <AppDatePicker id="cal-form-start" :model-value="form.startDate" :clearable="false" @update:model-value="onStartDate" />
                <v-text-field
                    v-if="!form.isFullDay"
                    :model-value="form.startTime"
                    type="time"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    class="cal-form__time"
                    :aria-label="t('calendarPage.form.fields.startTime')"
                    :error="!!fieldErrors.startTime"
                    @update:model-value="onStartTime"
                />
            </div>
            <p v-if="fieldErrors.startDate || fieldErrors.startTime" class="cal-form__error cal-form__span">
                {{ fieldErrors.startDate || fieldErrors.startTime }}
            </p>
        </div>

        <div class="cal-form__row">
            <label class="cal-form__label" for="cal-form-end">{{ t('calendarPage.form.fields.end') }}</label>
            <div class="cal-form__field cal-form__when">
                <AppDatePicker id="cal-form-end" v-model="form.endDate" :min="form.startDate ?? undefined" :clearable="false" />
                <v-text-field
                    v-if="!form.isFullDay"
                    v-model="form.endTime"
                    type="time"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    class="cal-form__time"
                    :aria-label="t('calendarPage.form.fields.endTime')"
                    :error="!!fieldErrors.endTime"
                />
            </div>
            <p v-if="fieldErrors.endDate || fieldErrors.endTime" class="cal-form__error cal-form__span">
                {{ fieldErrors.endDate || fieldErrors.endTime }}
            </p>
        </div>

        <div class="cal-form__row">
            <label class="cal-form__label">{{ t('calendarPage.form.fields.repeat') }}</label>
            <div class="cal-form__field">
                <AppSelect
                    id="cal-form-repeat"
                    v-model="form.repeat"
                    :items="repeatItems"
                    :label="t('calendarPage.form.fields.repeat')"
                    hide-details="auto"
                />
                <p v-if="form.repeat === 'custom'" class="cal-form__hint">{{ t('calendarPage.form.customRuleHint') }}</p>
            </div>
        </div>

        <div v-if="showsRepeatEnd" class="cal-form__row">
            <label class="cal-form__label">{{ t('calendarPage.form.fields.repeatEnd') }}</label>
            <div class="cal-form__field cal-form__when">
                <AppSelect
                    id="cal-form-repeat-end"
                    v-model="form.repeatEnd"
                    :items="repeatEndItems"
                    :label="t('calendarPage.form.fields.repeatEnd')"
                />
                <AppDatePicker
                    v-if="form.repeatEnd === 'until'"
                    v-model="form.repeatUntil"
                    :min="form.startDate ?? undefined"
                    :clearable="false"
                />
                <v-text-field
                    v-else-if="form.repeatEnd === 'count'"
                    v-model="form.repeatCount"
                    type="number"
                    min="1"
                    :max="REPEAT_COUNT_MAX"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :suffix="t('calendarPage.form.repeatCountSuffix')"
                    :aria-label="t('calendarPage.form.repeatEnd.count')"
                />
            </div>
            <p v-if="fieldErrors.repeatUntil || fieldErrors.repeatCount" class="cal-form__error cal-form__span">
                {{ fieldErrors.repeatUntil || fieldErrors.repeatCount }}
            </p>
        </div>

        <div class="cal-form__row">
            <label class="cal-form__label" for="cal-form-lieu">{{ t('calendarPage.form.fields.lieu') }}</label>
            <div class="cal-form__field">
                <v-text-field
                    id="cal-form-lieu"
                    v-model="form.lieu"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    :error="!!fieldErrors.lieu"
                    :error-messages="fieldErrors.lieu || undefined"
                />
            </div>
        </div>

        <div class="cal-form__row cal-form__row--top">
            <label class="cal-form__label" for="cal-form-description">{{ t('calendarPage.form.fields.description') }}</label>
            <div class="cal-form__field">
                <v-textarea
                    id="cal-form-description"
                    v-model="form.description"
                    color="primary"
                    variant="outlined"
                    hide-details="auto"
                    rows="3"
                    auto-grow
                    :error="!!fieldErrors.description"
                    :error-messages="fieldErrors.description || undefined"
                />
            </div>
        </div>

        <div class="cal-form__row cal-form__row--top">
            <label class="cal-form__label">{{ t('calendarPage.form.fields.reminders') }}</label>
            <div class="cal-form__field">
                <ul v-if="form.reminders.length" class="cal-form__reminders">
                    <li v-for="(reminder, index) in form.reminders" :key="`${reminder.beforeMinutes}-${reminder.canal}`" class="su-chip">
                        {{ reminderLabel(reminder.beforeMinutes) }}
                        <button
                            type="button"
                            class="cal-form__chip-remove"
                            :aria-label="t('calendarPage.form.reminders.remove', { label: reminderLabel(reminder.beforeMinutes) })"
                            @click="removeReminder(index)"
                        >
                            <XIcon :size="14" stroke-width="1.8" />
                        </button>
                    </li>
                </ul>
                <AppSelect
                    v-if="form.reminders.length < EVENT_REMINDERS_MAX"
                    id="cal-form-reminder-add"
                    :model-value="reminderPick"
                    :items="reminderItems"
                    :label="t('calendarPage.form.reminders.add')"
                    hide-details="auto"
                    @update:model-value="addReminder"
                />
                <p v-if="isEdit && form.repeat !== 'none' && form.reminders.length" class="cal-form__hint">
                    {{ t('calendarPage.form.remindersHint') }}
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Formulaire de fenêtre modale : libellé à gauche sur 170 px | champ carré (comme les autres formulaires). */
.cal-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.cal-form__row {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    align-items: center;
    gap: 8px 16px;
}

.cal-form__row--top {
    align-items: start;
}

.cal-form__row--top .cal-form__label {
    padding-top: 11px;
}

.cal-form__label {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.3;
}

.cal-form__field {
    min-width: 0;
}

.cal-form__when {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 132px;
    gap: 8px;
}

.cal-form__when > :only-child {
    grid-column: 1 / -1;
}

.cal-form__span {
    grid-column: 2;
}

.cal-form__field :deep(.v-field) {
    --v-input-control-height: 42px;
}

.cal-form__field :deep(.v-text-field input) {
    min-height: 42px;
    padding-top: 0;
    padding-bottom: 0;
}

.cal-form__hint,
.cal-form__error {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.cal-form__error {
    color: var(--danger);
}

.cal-form__reminders {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
}

.cal-form__reminders .su-chip {
    gap: 6px;
}

.cal-form__chip-remove {
    display: inline-flex;
    padding: 0;
    border: 0;
    background: none;
    color: var(--gray);
    cursor: pointer;
}

.cal-form__chip-remove:hover {
    color: var(--ink);
}

@media (max-width: 599.98px) {
    .cal-form__row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
    }

    .cal-form__span {
        grid-column: 1;
    }

    .cal-form__row--top .cal-form__label {
        padding-top: 0;
    }
}
</style>
