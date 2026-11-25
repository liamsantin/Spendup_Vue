<script setup lang="ts">
/**
 * Création et modification d'un événement saisi. Sur un événement récurrent, l'enregistrement et la suppression
 * demandent la portée (cette occurrence, les suivantes, toute la série).
 */
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { calendarApi } from '@/features/calendar/api';
import CalendarEventBudget from '@/features/calendar/components/forms/CalendarEventBudget.vue';
import CalendarEventForm, { type CalendarEventFormFieldErrors } from '@/features/calendar/components/forms/CalendarEventForm.vue';
import CalendarEventScopeDialog from '@/features/calendar/components/modals/CalendarEventScopeDialog.vue';
import {
    buildCreateEventPayload,
    buildUpdateEventPayload,
    emptyEventFormFields,
    eventToFormFields,
    isRepeatEdited,
    occurrenceStartOf,
    type CalendarEventFormFields,
    type CalendarEventPayloadFail
} from '@/features/calendar/payload';
import type { CalendarEvent, CalendarEventScope, CalendarInfo, CalendarOccurrence } from '@/features/calendar/types';
import { AppError, getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    modelValue: boolean;
    /** Événement à modifier ; absent = création. */
    eventPublicId?: string | null;
    /** Occurrence ouverte : ses dates remplissent le formulaire et servent de repère pour la portée. */
    occurrence?: CalendarOccurrence | null;
    /** Jour proposé à la création (`yyyy-MM-dd`). */
    date: string;
    /** Heure de début proposée à la création (`HH:mm`), par exemple le créneau cliqué. */
    time?: string | null;
    /** Heure de fin imposée (`HH:mm`), quand la plage a été tirée sur la grille. */
    endTime?: string | null;
    /** Titre déjà saisi (création rapide → « Plus d'options »). */
    title?: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    changed: [];
}>();

const { t } = useI18n();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const form = reactive<CalendarEventFormFields>(emptyEventFormFields(props.date));
const initial = ref<CalendarEventFormFields | null>(null);
const event = ref<CalendarEvent | null>(null);
const calendars = ref<CalendarInfo[]>([]);
const loading = ref(false);
const acting = ref(false);
const error = ref<string | null>(null);
const fieldErrors = reactive<CalendarEventFormFieldErrors>({});
const scopeDialog = ref<'save' | 'delete' | null>(null);
const confirmDelete = ref(false);

const isEdit = computed(() => !!props.eventPublicId);
const isRecurring = computed(() => !!event.value?.recurrenceRule);
const calendarItems = computed(() =>
    calendars.value.filter((c) => c.permission === 'write' || c.permission === 'manage').map((c) => ({ title: c.name, value: c.publicId }))
);

const canSave = computed(() => {
    if (loading.value || acting.value) return false;
    if (!isEdit.value) return true;
    if (!event.value || !initial.value) return false;
    const built = buildUpdateEventPayload(form, { event: event.value, initial: initial.value, scope: 'series' });
    return !built.ok || built.changed;
});

const scopeOpen = computed({
    get: () => scopeDialog.value !== null,
    set: (value: boolean) => {
        if (!value) scopeDialog.value = null;
    }
});

function clearErrors() {
    error.value = null;
    for (const key of Object.keys(fieldErrors) as (keyof CalendarEventFormFields)[]) fieldErrors[key] = null;
}

function showFail(fail: CalendarEventPayloadFail) {
    fieldErrors[fail.field] = t(`calendarPage.form.errors.${fail.code}`);
}

function showError(e: unknown) {
    const status = AppError.fromUnknown(e).status;
    if (status === 409) error.value = t('calendarPage.form.errors.conflict');
    else if (status === 404) error.value = t('calendarPage.form.errors.notFound');
    else error.value = getErrorMessage(e);
}

async function load() {
    clearErrors();
    event.value = null;
    initial.value = null;
    loading.value = true;
    try {
        const [list, preferences, loaded] = await Promise.all([
            calendarApi.calendars(),
            isEdit.value ? null : calendarApi.preferences(),
            props.eventPublicId ? calendarApi.getEvent(props.eventPublicId) : null
        ]);
        calendars.value = list.items.filter((c) => !c.isHidden);
        if (loaded) {
            event.value = loaded;
            Object.assign(form, eventToFormFields(loaded, props.occurrence));
        } else {
            const writable = calendarItems.value.map((c) => c.value);
            const preferred = preferences?.defaultCalendarId;
            Object.assign(
                form,
                emptyEventFormFields(props.date, {
                    calendarPublicId: preferred && writable.includes(preferred) ? preferred : (writable[0] ?? ''),
                    durationMinutes: preferences?.defaultDurationMinutes,
                    reminderMinutes: preferences?.defaultReminderMinutes,
                    startTime: props.time,
                    endTime: props.endTime
                })
            );
            form.title = props.title ?? '';
        }
        initial.value = { ...form, reminders: form.reminders.map((r) => ({ ...r })) };
    } catch (e) {
        error.value =
            AppError.fromUnknown(e).status === 404 ? t('calendarPage.form.errors.notFound') : t('calendarPage.form.errors.loadFailed');
    } finally {
        loading.value = false;
    }
}

watch(
    () => props.modelValue,
    (value) => {
        if (value) void load();
    }
);

function done() {
    emit('changed');
    open.value = false;
}

async function onSave() {
    clearErrors();
    if (!isEdit.value) {
        const built = buildCreateEventPayload(form);
        if (!built.ok) return showFail(built);
        acting.value = true;
        try {
            await calendarApi.createEvent(built.payload);
            done();
        } catch (e) {
            showError(e);
        } finally {
            acting.value = false;
        }
        return;
    }
    if (!event.value || !initial.value) return;
    const check = buildUpdateEventPayload(form, { event: event.value, initial: initial.value, scope: 'series' });
    if (!check.ok) return showFail(check);
    if (isRecurring.value) scopeDialog.value = 'save';
    else await save('series');
}

async function save(scope: CalendarEventScope) {
    if (!event.value || !initial.value) return;
    const built = buildUpdateEventPayload(form, {
        event: event.value,
        initial: initial.value,
        scope,
        occurrenceStart: props.occurrence ? occurrenceStartOf(props.occurrence) : null
    });
    scopeDialog.value = null;
    if (!built.ok) return showFail(built);
    if (!built.changed) return done();
    acting.value = true;
    try {
        await calendarApi.updateEvent(event.value.publicId, built.payload);
        done();
    } catch (e) {
        showError(e);
    } finally {
        acting.value = false;
    }
}

function onDelete() {
    clearErrors();
    if (isRecurring.value) scopeDialog.value = 'delete';
    else confirmDelete.value = true;
}

async function remove(scope: CalendarEventScope) {
    if (!event.value) return;
    const occurrenceStart = scope !== 'series' && props.occurrence ? (occurrenceStartOf(props.occurrence) ?? undefined) : undefined;
    acting.value = true;
    try {
        await calendarApi.deleteEvent(event.value.publicId, event.value.rowVersion, scope, occurrenceStart);
        scopeDialog.value = null;
        confirmDelete.value = false;
        done();
    } catch (e) {
        scopeDialog.value = null;
        confirmDelete.value = false;
        showError(e);
    } finally {
        acting.value = false;
    }
}

function onScope(scope: CalendarEventScope) {
    if (scopeDialog.value === 'delete') void remove(scope);
    else void save(scope);
}
</script>

<template>
    <AppModalBase
        v-model="open"
        :title="t(isEdit ? 'calendarPage.form.editTitle' : 'calendarPage.form.createTitle')"
        :max-width="640"
        :height="760"
        scrollable
        mobile-layout="fullscreen"
    >
        <AppAlert v-if="error" type="error" class="mb-4" closable @dismiss="error = null">
            {{ error }}
        </AppAlert>

        <div v-if="loading" class="cal-modal__loading" aria-busy="true">
            <span class="su-spin" aria-hidden="true" />
        </div>
        <CalendarEventForm
            v-else-if="!isEdit || event"
            :form="form"
            :is-edit="isEdit"
            :calendar-items="calendarItems"
            :field-errors="fieldErrors"
        />
        <CalendarEventBudget v-if="isEdit && event && !loading" :event-public-id="event.publicId" />

        <template #footer="{ close }">
            <button v-if="isEdit && event" type="button" class="su-btn su-btn--danger" :disabled="acting" @click="onDelete">
                {{ t('calendarPage.form.delete') }}
            </button>
            <span class="cal-modal__spacer" />
            <button type="button" class="su-btn" :disabled="acting" @click="close">
                {{ t('common.cancel') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" :disabled="!canSave" :aria-busy="acting || undefined" @click="onSave">
                {{ t('common.save') }}
            </button>
        </template>
    </AppModalBase>

    <CalendarEventScopeDialog
        v-model="scopeOpen"
        :mode="scopeDialog ?? 'save'"
        :allow-occurrence="scopeDialog === 'delete' || !initial || !isRepeatEdited(form, initial)"
        :loading="acting"
        @confirm="onScope"
    />

    <AppConfirmationModal
        v-model="confirmDelete"
        :title="t('calendarPage.deleteConfirm.title')"
        :message="t('calendarPage.deleteConfirm.message', { title: event?.title ?? '' })"
        :confirm-label="t('calendarPage.form.delete')"
        confirm-color="error"
        :loading="acting"
        @confirm="remove('series')"
    />
</template>

<style scoped>
.cal-modal__loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
}

.cal-modal__spacer {
    flex: 1 1 auto;
}
</style>
