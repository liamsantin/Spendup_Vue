<script setup lang="ts">
/** Ligne d'une occurrence : heure ou « journée entière », source, membre qui partage, montant. Un événement saisi s'ouvre au clic. */
import { computed, inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { CheckIcon, NotesIcon as NotePlusIcon } from 'vue-tabler-icons';
import { CALENDAR_PAY_KEY } from '@/features/calendar/pay';
import { calendarApi } from '@/features/calendar/api';
import {
    formatOccurrenceAmount,
    isCanceled,
    canAnchor,
    canPay,
    isEditableOccurrence,
    occurrenceFromEvent,
    occurrenceTimeRange,
    occurrenceTone,
    occurrenceToneStyle,
    paymentStatus,
    sourceRoute
} from '@/features/calendar/occurrences';
import { CALENDAR_SOURCE_KEYS, type CalendarOccurrence } from '@/features/calendar/types';

const props = defineProps<{ occurrence: CalendarOccurrence }>();

const emit = defineEmits<{ open: [occurrence: CalendarOccurrence] }>();

const { t, locale } = useI18n();

const router = useRouter();

const editable = computed(() => isEditableOccurrence(props.occurrence));
const route = computed(() => sourceRoute(props.occurrence));
const status = computed(() => paymentStatus(props.occurrence));
const actionable = computed(() => editable.value || !!route.value);

const pay = inject(CALENDAR_PAY_KEY, null);
const payable = computed(() => !!pay && canPay(props.occurrence));
const hasNote = computed(() => !!props.occurrence.eventPublicId && !!props.occurrence.sourceKey);
const anchorable = computed(() => canAnchor(props.occurrence));
const anchoring = ref(false);

async function addNote() {
    const o = props.occurrence;
    if (anchoring.value || !o.sourceKey || !o.entityPublicId || !o.startDate) return;
    anchoring.value = true;
    try {
        const event = await calendarApi.anchor(o.sourceKey, o.entityPublicId, o.startDate);
        emit('open', {
            ...occurrenceFromEvent(event),
            anchoredFrom: { sourceKey: o.sourceKey, entityPublicId: o.entityPublicId, date: o.startDate }
        });
    } catch {
        // ouverture impossible : l'occurrence reste telle quelle
    } finally {
        anchoring.value = false;
    }
}

function activate() {
    if (editable.value) emit('open', props.occurrence);
    else if (route.value) void router.push(route.value);
}

const meta = computed(() => {
    const occurrence = props.occurrence;
    const parts = [occurrenceTimeRange(occurrence, locale.value) ?? t('calendarPage.allDay')];
    const key = occurrence.sourceKey;
    if (key) parts.push((CALENDAR_SOURCE_KEYS as readonly string[]).includes(key) ? t(`calendarPage.sources.${key}`) : key);
    if (occurrence.sharedBy) parts.push(t('calendarPage.sharedBy', { name: occurrence.sharedBy }));
    if (status.value) parts.push(t(`calendarPage.status.${status.value}`));
    if (isCanceled(occurrence)) parts.push(t('calendarPage.canceled'));
    return parts.join(' · ');
});
</script>

<template>
    <li class="cal-list__item" :class="`cal-tone--${occurrenceTone(occurrence)}`" :style="occurrenceToneStyle(occurrence)">
        <component
            :is="actionable ? 'button' : 'div'"
            :type="actionable ? 'button' : undefined"
            class="cal-list__row"
            :class="{ 'cal-list__row--action': actionable }"
            :title="route && !editable ? t('calendarPage.openSource') : undefined"
            @click="activate"
        >
            <span class="su-sq cal-list__sq" aria-hidden="true" />
            <span class="cal-list__main">
                <span class="cal-list__title" :class="{ 'cal-is-canceled': isCanceled(occurrence) }">{{ occurrence.title }}</span>
                <span class="cal-list__meta" :class="{ 'cal-list__meta--overdue': status === 'overdue' }">{{ meta }}</span>
            </span>
            <span
                v-if="occurrence.amount != null && occurrence.currency"
                class="cal-list__amount"
                :class="occurrence.amount < 0 ? 'su-neg' : 'su-pos'"
                >{{ formatOccurrenceAmount(occurrence.amount, occurrence.currency) }}</span
            >
        </component>
        <button
            v-if="anchorable"
            type="button"
            class="cal-list__note"
            :disabled="anchoring"
            :class="{ 'cal-list__note--on': hasNote }"
            :title="hasNote ? t('calendarPage.openNote') : t('calendarPage.addNote')"
            :aria-label="hasNote ? t('calendarPage.openNote') : t('calendarPage.addNote')"
            @click="addNote"
        >
            <NotePlusIcon :size="18" stroke-width="1.8" aria-hidden="true" />
        </button>
        <button
            v-if="payable"
            type="button"
            class="cal-list__note"
            :title="t('calendarPage.markPaid')"
            :aria-label="t('calendarPage.markPaid')"
            @click="pay?.(occurrence)"
        >
            <CheckIcon :size="18" stroke-width="1.8" aria-hidden="true" />
        </button>
    </li>
</template>
