<script setup lang="ts">
/** Panneau des couches : affiche ou masque les événements saisis et chaque source (filtre visuel, par appareil). */
import { useI18n } from 'vue-i18n';
import { CALENDAR_LAYER_KEYS, EVENTS_LAYER, layerTone } from '@/features/calendar/layers';

defineProps<{
    hidden: ReadonlySet<string>;
    counts: ReadonlyMap<string, number>;
}>();

const emit = defineEmits<{ toggle: [key: string] }>();

const { t } = useI18n();

function label(key: string): string {
    return key === EVENTS_LAYER ? t('calendarPage.layers.events') : t(`calendarPage.sources.${key}`);
}
</script>

<template>
    <section class="su-section">
        <header class="su-section__head">
            <h2>{{ t('calendarPage.layers.title') }}</h2>
        </header>
        <ul class="cal-list">
            <li v-for="key in CALENDAR_LAYER_KEYS" :key="key" class="cal-list__item" :class="`cal-tone--${layerTone(key)}`">
                <label class="cal-layer" :class="{ 'cal-layer--off': hidden.has(key) }">
                    <input type="checkbox" class="cal-layer__input" :checked="!hidden.has(key)" @change="emit('toggle', key)" />
                    <span class="su-sq cal-list__sq" aria-hidden="true" />
                    <span class="cal-list__title">{{ label(key) }}</span>
                    <span class="cal-list__meta cal-layer__count">{{ counts.get(key) ?? 0 }}</span>
                </label>
            </li>
        </ul>
    </section>
</template>

<style scoped>
.cal-layer {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-width: 0;
    cursor: pointer;
}

.cal-layer__input {
    accent-color: var(--tone-ink);
    margin: 0;
}

.cal-layer__count {
    margin-left: auto;
}

.cal-layer--off .su-sq,
.cal-layer--off .cal-list__title {
    opacity: 0.4;
}
</style>
