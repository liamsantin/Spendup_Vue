<script setup lang="ts">
/** Portée d'une modification ou d'une suppression sur un événement récurrent. */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppRadioButton from '@/components/shared/radio/AppRadioButton.vue';
import type { CalendarEventScope } from '@/features/calendar/types';

const props = defineProps<{
    modelValue: boolean;
    mode: 'save' | 'delete';
    /** Faux quand la répétition a changé : une seule occurrence ne peut pas la porter. */
    allowOccurrence: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirm: [scope: CalendarEventScope];
}>();

const { t } = useI18n();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const scope = ref<CalendarEventScope>('occurrence');

const items = computed(() =>
    (['occurrence', 'following', 'series'] as CalendarEventScope[]).map((value) => ({
        value,
        title: t(`calendarPage.scope.${value}`),
        disabled: value === 'occurrence' && !props.allowOccurrence
    }))
);

watch(open, (value) => {
    if (value) scope.value = props.allowOccurrence ? 'occurrence' : 'following';
});
</script>

<template>
    <AppConfirmationModal
        v-model="open"
        :title="t(mode === 'save' ? 'calendarPage.scope.saveTitle' : 'calendarPage.scope.deleteTitle')"
        :confirm-label="t(mode === 'save' ? 'common.save' : 'calendarPage.form.delete')"
        :confirm-color="mode === 'delete' ? 'error' : 'primary'"
        :loading="loading"
        @confirm="emit('confirm', scope)"
    >
        <template #header-extra>
            <AppRadioButton v-model="scope" :items="items" class="cal-scope" />
            <p v-if="!allowOccurrence" class="cal-scope__hint">{{ t('calendarPage.scope.occurrenceLocked') }}</p>
        </template>
    </AppConfirmationModal>
</template>

<style scoped>
.cal-scope {
    margin-top: 12px;
}

.cal-scope__hint {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
}
</style>
