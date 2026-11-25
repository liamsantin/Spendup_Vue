<script setup lang="ts">
/** Premier passage : choix du profil de départ des sources (Minimal, Équilibré, Complet). Réglable ensuite dans les réglages. */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { CALENDAR_PROFILES, type CalendarProfile } from '@/features/calendar/types';

const props = defineProps<{ modelValue: boolean; saving?: boolean; error?: string | null }>();

const emit = defineEmits<{ 'update:modelValue': [value: boolean]; choose: [profile: CalendarProfile] }>();

const { t } = useI18n();

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const selected = ref<CalendarProfile>('equilibre');
</script>

<template>
    <AppModalBase v-model="open" :title="t('calendarPage.firstOpen.title')" :max-width="520" mobile-layout="fullscreen">
        <p class="cal-profile__hint">{{ t('calendarPage.firstOpen.hint') }}</p>
        <div class="cal-profile__options" role="radiogroup" :aria-label="t('calendarPage.settings.profile')">
            <button
                v-for="profile in CALENDAR_PROFILES"
                :key="profile"
                type="button"
                role="radio"
                class="cal-profile__option"
                :class="{ 'is-selected': selected === profile }"
                :aria-checked="selected === profile"
                @click="selected = profile"
            >
                <span class="cal-profile__name">{{ t(`calendarPage.settings.profiles.${profile}`) }}</span>
                <span class="cal-profile__desc">{{ t(`calendarPage.firstOpen.${profile}`) }}</span>
            </button>
        </div>
        <p v-if="error" class="cal-profile__error" role="alert">{{ error }}</p>

        <template #footer="{ close }">
            <button type="button" class="su-btn su-btn--ink" :disabled="saving" @click="emit('choose', selected)">
                {{ t('calendarPage.firstOpen.confirm') }}
            </button>
            <span class="cal-profile__spacer" />
            <button type="button" class="su-btn" :disabled="saving" @click="close">
                {{ t('calendarPage.firstOpen.later') }}
            </button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.cal-profile__hint {
    margin: 0 0 16px;
    color: var(--gray);
    font-size: 14px;
}

.cal-profile__options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.cal-profile__option {
    appearance: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.cal-profile__option.is-selected {
    border-color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink);
}

.cal-profile__name {
    font-weight: 700;
}

.cal-profile__desc {
    color: var(--gray);
    font-size: 13px;
}

.cal-profile__error {
    margin: 12px 0 0;
    color: var(--red, #dc2626);
    font-size: 13px;
}

.cal-profile__spacer {
    flex: 1 1 auto;
}
</style>
