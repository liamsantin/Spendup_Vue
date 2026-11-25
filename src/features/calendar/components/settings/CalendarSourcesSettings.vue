<script setup lang="ts">
/**
 * Onglet Sources : profil de départ et réglage de chaque source (activation, mode d'affichage, montant minimum).
 * Chaque changement est enregistré aussitôt (`PATCH /api/calendar/sources/{key}`).
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { calendarApi } from '@/features/calendar/api';
import {
    CALENDAR_DISPLAY_MODES,
    CALENDAR_PROFILES,
    type CalendarDisplayMode,
    type CalendarProfile,
    type CalendarSourceSetting,
    type UpdateCalendarSourcePayload
} from '@/features/calendar/types';
import { getErrorMessage } from '@/utils/errors/app-error';

const { t } = useI18n();

const profile = ref<CalendarProfile>('equilibre');
const sources = ref<CalendarSourceSetting[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref<string | null>(null);

const profileItems = computed(() => CALENDAR_PROFILES.map((value) => ({ title: t(`calendarPage.settings.profiles.${value}`), value })));
const modeItems = computed(() =>
    CALENDAR_DISPLAY_MODES.map((value) => ({ title: t(`calendarPage.settings.displayModes.${value}`), value }))
);

function sourceLabel(source: CalendarSourceSetting): string {
    const key = `calendarPage.sources.${source.key}`;
    return t(key) === key ? source.label : t(key);
}

async function reload() {
    try {
        const list = await calendarApi.sources();
        profile.value = list.profile;
        sources.value = list.items;
    } catch (e) {
        error.value = getErrorMessage(e);
    }
}

async function run(action: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        await action();
    } catch (e) {
        error.value = getErrorMessage(e) || t('calendarPage.settings.sourceSaveError');
        await reload();
    } finally {
        busy.value = false;
    }
}

function patch(source: CalendarSourceSetting, payload: UpdateCalendarSourcePayload) {
    return run(async () => {
        const saved = await calendarApi.updateSource(source.key, payload);
        sources.value = sources.value.map((item) => (item.key === saved.key ? saved : item));
    });
}

function onProfile(value: CalendarProfile) {
    return run(async () => {
        const list = await calendarApi.setSourceProfile(value);
        profile.value = list.profile;
        sources.value = list.items;
    });
}

function onMinAmount(source: CalendarSourceSetting, raw: string) {
    const value = raw.trim() === '' ? null : Number(raw);
    if (value != null && (Number.isNaN(value) || value < 0)) return;
    if (value === source.minAmount) return;
    void patch(source, value == null ? { clearMinAmount: true } : { minAmount: value });
}

onMounted(async () => {
    await reload();
    loading.value = false;
});
</script>

<template>
    <section v-if="!loading && sources.length" class="su-settings cal-sources">
        <div class="su-settings__lead">
            <h2>{{ t('calendarPage.settings.sourcesTitle') }}</h2>
            <p>{{ t('calendarPage.settings.sourcesHint') }}</p>
        </div>
        <div class="su-settings__fields">
            <p v-if="error" class="cal-sources__error" role="alert">{{ error }}</p>

            <div class="su-field is-full">
                <label class="su-field__label" for="cal-sources-profile">{{ t('calendarPage.settings.profile') }}</label>
                <AppSelect
                    id="cal-sources-profile"
                    :model-value="profile"
                    :items="profileItems"
                    item-title="title"
                    item-value="value"
                    :label="t('calendarPage.settings.profile')"
                    :disabled="busy"
                    hide-details
                    @update:model-value="onProfile($event as CalendarProfile)"
                />
                <p class="cal-sources__hint">{{ t('calendarPage.settings.profileHint') }}</p>
            </div>

            <article v-for="source in sources" :key="source.key" class="cal-sources__card is-full" :data-source="source.key">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" :for="`cal-source-${source.key}`">
                            <span class="cal-sources__dot" :style="{ background: source.color }" aria-hidden="true" />
                            {{ sourceLabel(source) }}
                            <span v-if="source.isCustom" class="su-chip">{{ t('calendarPage.settings.customized') }}</span>
                        </label>
                    </div>
                    <AppSwitch
                        :id="`cal-source-${source.key}`"
                        :model-value="source.isEnabled"
                        :disabled="busy"
                        @update:model-value="patch(source, { isEnabled: !!$event })"
                    />
                </div>
                <div v-if="source.isEnabled" class="cal-sources__row">
                    <div class="su-field">
                        <label class="su-field__label" :for="`cal-source-mode-${source.key}`">{{
                            t('calendarPage.settings.displayMode')
                        }}</label>
                        <AppSelect
                            :id="`cal-source-mode-${source.key}`"
                            :model-value="source.displayMode"
                            :items="modeItems"
                            item-title="title"
                            item-value="value"
                            :label="t('calendarPage.settings.displayMode')"
                            :disabled="busy"
                            hide-details
                            @update:model-value="patch(source, { displayMode: $event as CalendarDisplayMode })"
                        />
                    </div>
                    <div class="su-field">
                        <label class="su-field__label" :for="`cal-source-min-${source.key}`">{{
                            t('calendarPage.settings.minAmount')
                        }}</label>
                        <v-text-field
                            :id="`cal-source-min-${source.key}`"
                            :model-value="source.minAmount ?? ''"
                            type="number"
                            min="0"
                            step="1"
                            suffix="CHF"
                            color="primary"
                            variant="outlined"
                            hide-details
                            :disabled="busy"
                            @change="onMinAmount(source, ($event.target as HTMLInputElement).value)"
                        />
                    </div>
                </div>
            </article>
        </div>
    </section>
</template>

<style scoped>
.cal-sources__card {
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.cal-sources__card:first-of-type {
    border-top: 0;
}

.cal-sources__row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 8px;
}

.cal-sources__dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 8px;
    border-radius: 2px;
}

.cal-sources__hint {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--gray);
}

.cal-sources__error {
    margin: 0;
    color: var(--danger, #9b2c2c);
    font-size: 14px;
}
</style>
