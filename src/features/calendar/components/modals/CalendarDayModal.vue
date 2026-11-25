<script setup lang="ts">
/** Tous les éléments d'un jour dans une modale (« Voir tout le jour »). Un événement saisi s'ouvre au clic. */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import CalendarOccurrenceRow from '@/features/calendar/components/list/CalendarOccurrenceRow.vue';
import type { CalendarOccurrence } from '@/features/calendar/types';

const props = defineProps<{
    modelValue: boolean;
    title: string;
    items: CalendarOccurrence[];
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    open: [occurrence: CalendarOccurrence];
    create: [];
}>();

const { t } = useI18n();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});
</script>

<template>
    <AppModalBase v-model="open" :title="title" :max-width="560" :height="640" scrollable mobile-layout="fullscreen">
        <ul v-if="items.length" class="cal-list is-full">
            <CalendarOccurrenceRow v-for="occurrence in items" :key="occurrence.id" :occurrence="occurrence" @open="emit('open', $event)" />
        </ul>
        <p v-else class="cal-side__empty">{{ t('calendarPage.emptyDay') }}</p>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ink" @click="emit('create')">
                {{ t('calendarPage.newEvent') }}
            </button>
            <span class="cal-day-modal__spacer" />
            <button type="button" class="su-btn" @click="close">
                {{ t('common.close') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.cal-day-modal__spacer {
    flex: 1 1 auto;
}
</style>
