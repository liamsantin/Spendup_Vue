<script setup lang="ts">
/** Éléments masqués : liste des exclusions et « Réafficher » (`DELETE /api/calendar/exclusions/{key}/{entityPublicId}`). */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { calendarApi } from '@/features/calendar/api';
import { CALENDAR_SOURCE_KEYS, type CalendarSourceExclusion } from '@/features/calendar/types';
import { getErrorMessage } from '@/utils/errors/app-error';

const { t } = useI18n();

const items = ref<CalendarSourceExclusion[]>([]);
const loading = ref(true);
const busyKey = ref<string | null>(null);
const error = ref<string | null>(null);

const rows = computed(() =>
    items.value.map((item) => ({
        ...item,
        id: `${item.sourceKey}:${item.entityPublicId}`,
        source: (CALENDAR_SOURCE_KEYS as readonly string[]).includes(item.sourceKey)
            ? t(`calendarPage.sources.${item.sourceKey}`)
            : item.sourceKey
    }))
);

async function reload() {
    try {
        items.value = (await calendarApi.exclusions()).items;
    } catch (e) {
        error.value = getErrorMessage(e);
    }
}

async function show(item: CalendarSourceExclusion & { id: string }) {
    if (busyKey.value) return;
    busyKey.value = item.id;
    error.value = null;
    try {
        await calendarApi.include(item.sourceKey, item.entityPublicId);
        items.value = items.value.filter((x) => !(x.sourceKey === item.sourceKey && x.entityPublicId === item.entityPublicId));
    } catch (e) {
        error.value = getErrorMessage(e);
        await reload();
    } finally {
        busyKey.value = null;
    }
}

onMounted(async () => {
    await reload();
    loading.value = false;
});
</script>

<template>
    <section v-if="!loading" class="su-settings cal-hidden">
        <div class="su-settings__lead">
            <h2>{{ t('calendarPage.settings.hiddenTitle') }}</h2>
            <p>{{ t('calendarPage.settings.hiddenHint') }}</p>
        </div>
        <div class="su-settings__fields">
            <p v-if="error" class="cal-hidden__error" role="alert">{{ error }}</p>
            <ul v-if="rows.length" class="cal-list is-full">
                <li v-for="row in rows" :key="row.id" class="cal-list__item">
                    <span class="cal-list__main">
                        <span class="cal-list__title">{{ row.label }}</span>
                        <span class="cal-list__meta">{{ row.source }}</span>
                    </span>
                    <button type="button" class="su-btn su-btn--ghost" :disabled="busyKey !== null" @click="show(row)">
                        {{ t('calendarPage.settings.show') }}
                    </button>
                </li>
            </ul>
            <p v-else class="cal-hidden__empty is-full">{{ t('calendarPage.settings.hiddenEmpty') }}</p>
        </div>
    </section>
</template>

<style scoped>
.cal-hidden__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.cal-hidden__error {
    margin: 0;
    color: var(--danger, #9b2c2c);
    font-size: 14px;
}
</style>
