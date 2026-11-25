<script setup lang="ts">
/**
 * Réglages généraux du calendrier : Affichage, Création, Finance (mode discret), Fuseau.
 * Les groupes Social et Notifications restent hors de cet écran.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { calendarApi } from '@/features/calendar/api';
import { useCalendarPreferences } from '@/features/calendar/composables/useCalendarPreferences';
import { CALENDAR_VIEWS, type CalendarPreferences, type UpdateCalendarPreferencesPayload } from '@/features/calendar/types';
import { TIMEZONE_OPTIONS } from '@/features/user-settings/types';
import { getErrorMessage } from '@/utils/errors/app-error';

const REMINDER_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440];
const DURATION_CHOICES = [30, 60];
const NONE = '';

type Draft = {
    defaultView: string;
    weekStartsOn: number;
    showWeekends: boolean;
    showWeekNumbers: boolean;
    use24HourClock: boolean;
    dayStartHour: number;
    dayEndHour: number;
    defaultCalendarId: string;
    defaultDurationMinutes: number;
    defaultVisibilite: string;
    /** Chaîne vide : aucun rappel. */
    reminder: string;
    timezone: string;
    secondTimezone: string;
    discreetMode: boolean;
    showProjectedBalance: boolean;
};

const emit = defineEmits<{ dirty: [value: boolean] }>();

const { t, locale } = useI18n();
const { load, save } = useCalendarPreferences();

const draft = ref<Draft | null>(null);
const baseline = ref('');
const calendars = ref<{ title: string; value: string }[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);

const isDirty = computed(() => draft.value != null && JSON.stringify(draft.value) !== baseline.value);

watch(isDirty, (value) => emit('dirty', value));

const viewItems = computed(() => CALENDAR_VIEWS.map((value) => ({ title: t(`calendarPage.views.${value}`), value })));
const weekDayItems = computed(() =>
    [1, 2, 3, 4, 5, 6, 7].map((value) => ({
        title: new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(new Date(2024, 0, value)),
        value
    }))
);
const hourItems = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => {
        const value = from + i;
        return { title: String(value).padStart(2, '0'), value };
    });
const startHourItems = computed(() => hourItems(0, 23));
const endHourItems = computed(() => hourItems(1, 24));
const durationItems = computed(() => {
    const values = new Set(DURATION_CHOICES);
    if (draft.value) values.add(draft.value.defaultDurationMinutes);
    return [...values].sort((a, b) => a - b).map((value) => ({ title: t('calendarPage.settings.minutes', { count: value }), value }));
});
const visibilityItems = computed(() =>
    (['prive', 'famille', 'partage'] as const).map((value) => ({ title: t(`calendarPage.settings.visibility.${value}`), value }))
);
const reminderItems = computed(() => [
    { title: t('calendarPage.settings.reminderNone'), value: NONE },
    ...REMINDER_CHOICES.map((value) => ({ title: reminderLabel(value), value: String(value) }))
]);
const timezoneItems = computed(() => {
    const zones = new Set(TIMEZONE_OPTIONS);
    if (draft.value?.timezone) zones.add(draft.value.timezone);
    return [...zones];
});
const secondTimezoneItems = computed(() => [
    { title: t('calendarPage.settings.noSecondTimezone'), value: NONE },
    ...timezoneItems.value.map((value) => ({ title: value, value }))
]);
const calendarItems = computed(() => [{ title: t('calendarPage.settings.firstCalendar'), value: NONE }, ...calendars.value]);

function reminderLabel(minutes: number): string {
    if (minutes === 0) return t('calendarPage.form.reminders.atStart');
    if (minutes % 1440 === 0) return t('calendarPage.form.reminders.days', { count: minutes / 1440 }, minutes / 1440);
    if (minutes % 60 === 0) return t('calendarPage.form.reminders.hours', { count: minutes / 60 });
    return t('calendarPage.form.reminders.minutes', { count: minutes });
}

function toDraft(prefs: CalendarPreferences): Draft {
    return {
        defaultView: prefs.defaultView,
        weekStartsOn: prefs.weekStartsOn,
        showWeekends: prefs.showWeekends,
        showWeekNumbers: prefs.showWeekNumbers,
        use24HourClock: prefs.use24HourClock,
        dayStartHour: prefs.dayStartHour,
        dayEndHour: prefs.dayEndHour,
        defaultCalendarId: prefs.defaultCalendarId ?? NONE,
        defaultDurationMinutes: prefs.defaultDurationMinutes,
        defaultVisibilite: prefs.defaultVisibilite,
        reminder: prefs.defaultReminderMinutes == null ? NONE : String(prefs.defaultReminderMinutes),
        timezone: prefs.timezone,
        secondTimezone: prefs.secondTimezone ?? NONE,
        discreetMode: prefs.discreetMode ?? false,
        showProjectedBalance: prefs.showProjectedBalance ?? false
    };
}

function snapshot(value: Draft): string {
    return JSON.stringify(value);
}

async function reload() {
    loading.value = true;
    error.value = null;
    try {
        const [prefs, list] = await Promise.all([load(), calendarApi.calendars()]);
        calendars.value = list.items.map((item) => ({ title: item.name, value: item.publicId }));
        const next = toDraft(prefs);
        draft.value = next;
        baseline.value = snapshot(next);
        emit('dirty', false);
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

function payloadOf(value: Draft): UpdateCalendarPreferencesPayload {
    return {
        defaultView: value.defaultView,
        weekStartsOn: Number(value.weekStartsOn),
        showWeekends: value.showWeekends,
        showWeekNumbers: value.showWeekNumbers,
        use24HourClock: value.use24HourClock,
        dayStartHour: Number(value.dayStartHour),
        dayEndHour: Number(value.dayEndHour),
        defaultCalendarId: value.defaultCalendarId,
        defaultDurationMinutes: Number(value.defaultDurationMinutes),
        defaultVisibilite: value.defaultVisibilite,
        ...(value.reminder === NONE ? { clearDefaultReminder: true } : { defaultReminderMinutes: Number(value.reminder) }),
        timezone: value.timezone,
        secondTimezone: value.secondTimezone,
        discreetMode: value.discreetMode,
        showProjectedBalance: value.showProjectedBalance
    };
}

async function saveSettings() {
    const value = draft.value;
    if (!value || saving.value) return;
    if (Number(value.dayEndHour) <= Number(value.dayStartHour)) {
        error.value = t('calendarPage.settings.invalidRange');
        return;
    }
    saving.value = true;
    error.value = null;
    try {
        const saved = toDraft(await save(payloadOf(value)));
        draft.value = saved;
        baseline.value = snapshot(saved);
        emit('dirty', false);
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        saving.value = false;
    }
}

function resetSettings() {
    if (!baseline.value) return;
    draft.value = JSON.parse(baseline.value) as Draft;
    error.value = null;
    emit('dirty', false);
}

onMounted(() => void reload());

defineExpose({
    saveSettings,
    resetSettings,
    get loading() {
        return loading.value || saving.value;
    }
});
</script>

<template>
    <div v-if="loading" class="cal-settings__loading" aria-busy="true">
        <span class="su-spin" aria-hidden="true" />
    </div>
    <div v-else-if="draft" class="cal-settings">
        <p v-if="error" class="cal-settings__error" role="alert">{{ error }}</p>

        <section class="su-settings">
            <div class="su-settings__lead">
                <h2>{{ t('calendarPage.settings.display') }}</h2>
                <p>{{ t('calendarPage.settings.displayHint') }}</p>
            </div>
            <div class="su-settings__fields">
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-view">{{ t('calendarPage.settings.defaultView') }}</label>
                    <AppSelect
                        id="cal-pref-view"
                        v-model="draft.defaultView"
                        :items="viewItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.defaultView')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-week">{{ t('calendarPage.settings.weekStartsOn') }}</label>
                    <AppSelect
                        id="cal-pref-week"
                        v-model="draft.weekStartsOn"
                        :items="weekDayItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.weekStartsOn')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-start">{{ t('calendarPage.settings.dayStart') }}</label>
                    <AppSelect
                        id="cal-pref-start"
                        v-model="draft.dayStartHour"
                        :items="startHourItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.dayStart')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-end">{{ t('calendarPage.settings.dayEnd') }}</label>
                    <AppSelect
                        id="cal-pref-end"
                        v-model="draft.dayEndHour"
                        :items="endHourItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.dayEnd')"
                        hide-details
                    />
                </div>
                <div class="is-full">
                    <div class="su-switch-row">
                        <div class="su-switch-row__text">
                            <label class="su-switch-row__label" for="cal-pref-weekends">{{
                                t('calendarPage.settings.showWeekends')
                            }}</label>
                        </div>
                        <AppSwitch id="cal-pref-weekends" v-model="draft.showWeekends" />
                    </div>
                    <div class="su-switch-row">
                        <div class="su-switch-row__text">
                            <label class="su-switch-row__label" for="cal-pref-numbers">{{
                                t('calendarPage.settings.showWeekNumbers')
                            }}</label>
                        </div>
                        <AppSwitch id="cal-pref-numbers" v-model="draft.showWeekNumbers" />
                    </div>
                    <div class="su-switch-row">
                        <div class="su-switch-row__text">
                            <label class="su-switch-row__label" for="cal-pref-clock">{{ t('calendarPage.settings.use24HourClock') }}</label>
                        </div>
                        <AppSwitch id="cal-pref-clock" v-model="draft.use24HourClock" />
                    </div>
                </div>
            </div>
        </section>

        <section class="su-settings">
            <div class="su-settings__lead">
                <h2>{{ t('calendarPage.settings.creation') }}</h2>
                <p>{{ t('calendarPage.settings.creationHint') }}</p>
            </div>
            <div class="su-settings__fields">
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-calendar">{{ t('calendarPage.settings.defaultCalendar') }}</label>
                    <AppSelect
                        id="cal-pref-calendar"
                        v-model="draft.defaultCalendarId"
                        :items="calendarItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.defaultCalendar')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-duration">{{ t('calendarPage.settings.duration') }}</label>
                    <AppSelect
                        id="cal-pref-duration"
                        v-model="draft.defaultDurationMinutes"
                        :items="durationItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.duration')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-visibility">{{ t('calendarPage.settings.visibilityLabel') }}</label>
                    <AppSelect
                        id="cal-pref-visibility"
                        v-model="draft.defaultVisibilite"
                        :items="visibilityItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.visibilityLabel')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-reminder">{{ t('calendarPage.settings.reminder') }}</label>
                    <AppSelect
                        id="cal-pref-reminder"
                        v-model="draft.reminder"
                        :items="reminderItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.reminder')"
                        hide-details
                    />
                </div>
            </div>
        </section>

        <section class="su-settings">
            <div class="su-settings__lead">
                <h2>{{ t('calendarPage.settings.finance') }}</h2>
                <p>{{ t('calendarPage.settings.financeHint') }}</p>
            </div>
            <div class="su-settings__fields">
                <div class="is-full">
                    <div class="su-switch-row">
                        <div class="su-switch-row__text">
                            <label class="su-switch-row__label" for="cal-pref-discreet">{{
                                t('calendarPage.settings.discreetMode')
                            }}</label>
                            <p class="su-switch-row__hint">{{ t('calendarPage.settings.discreetModeHint') }}</p>
                        </div>
                        <AppSwitch id="cal-pref-discreet" v-model="draft.discreetMode" />
                    </div>
                </div>
                <div class="is-full">
                    <div class="su-switch-row">
                        <div class="su-switch-row__text">
                            <label class="su-switch-row__label" for="cal-pref-projected">{{
                                t('calendarPage.settings.projectedBalance')
                            }}</label>
                            <p class="su-switch-row__hint">{{ t('calendarPage.settings.projectedBalanceHint') }}</p>
                        </div>
                        <AppSwitch id="cal-pref-projected" v-model="draft.showProjectedBalance" />
                    </div>
                </div>
            </div>
        </section>

        <section class="su-settings">
            <div class="su-settings__lead">
                <h2>{{ t('calendarPage.settings.timezone') }}</h2>
                <p>{{ t('calendarPage.settings.timezoneHint') }}</p>
            </div>
            <div class="su-settings__fields">
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-tz">{{ t('calendarPage.settings.timezone') }}</label>
                    <AppSelect
                        id="cal-pref-tz"
                        v-model="draft.timezone"
                        :items="timezoneItems"
                        :label="t('calendarPage.settings.timezone')"
                        hide-details
                    />
                </div>
                <div class="su-field">
                    <label class="su-field__label" for="cal-pref-tz2">{{ t('calendarPage.settings.secondTimezone') }}</label>
                    <AppSelect
                        id="cal-pref-tz2"
                        v-model="draft.secondTimezone"
                        :items="secondTimezoneItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.settings.secondTimezone')"
                        hide-details
                    />
                </div>
            </div>
        </section>
    </div>
    <p v-else-if="error" class="cal-settings__error" role="alert">{{ error }}</p>
</template>

<style scoped>
.cal-settings {
    display: flex;
    flex-direction: column;
    gap: 28px;
}

.cal-settings__loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
}

.cal-settings__error {
    margin: 0;
    color: var(--danger, #9b2c2c);
    font-size: 14px;
}
</style>
