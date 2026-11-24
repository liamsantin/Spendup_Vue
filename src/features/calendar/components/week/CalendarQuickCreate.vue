<script setup lang="ts">
/**
 * Création rapide sur un créneau : titre puis Entrée. Calendrier, durée et rappel viennent des réglages de création
 * (complétés par le serveur). « Plus d'options » ouvre le formulaire complet au même créneau.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { calendarApi } from '@/features/calendar/api';
import { parseYmd } from '@/features/calendar/dates';
import { browserTimezone, EVENT_TITLE_MAX, localToUtcIso } from '@/features/calendar/payload';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    ymd: string;
    /** `HH:mm`, heure locale. */
    time: string;
}>();

const emit = defineEmits<{
    created: [];
    more: [title: string];
    close: [];
}>();

const { t, locale } = useI18n();

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const title = ref('');
const saving = ref(false);
const error = ref<string | null>(null);

const when = computed(() => {
    const day = new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short' }).format(parseYmd(props.ymd));
    return `${day} · ${props.time}`;
});

async function submit() {
    const trimmed = title.value.trim();
    if (!trimmed || saving.value) return;
    saving.value = true;
    error.value = null;
    try {
        await calendarApi.createEvent({
            calendarPublicId: null,
            title: trimmed,
            isFullDay: false,
            startUtc: localToUtcIso(props.ymd, props.time),
            timezone: browserTimezone()
        });
        emit('created');
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        saving.value = false;
    }
}

function onPointerDown(event: PointerEvent) {
    if (root.value && !root.value.contains(event.target as Node)) emit('close');
}

onMounted(() => {
    void nextTick(() => input.value?.focus());
    document.addEventListener('pointerdown', onPointerDown, true);
});

onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true));
</script>

<template>
    <form
        ref="root"
        class="cal-quick"
        role="dialog"
        :aria-label="t('calendarPage.quick.label')"
        @submit.prevent="submit"
        @click.stop
        @keydown.esc.stop="emit('close')"
    >
        <p class="cal-quick__when">{{ when }}</p>
        <input
            ref="input"
            v-model="title"
            class="cal-quick__input"
            type="text"
            :maxlength="EVENT_TITLE_MAX"
            :placeholder="t('calendarPage.quick.placeholder')"
            :aria-label="t('calendarPage.form.fields.title')"
            :disabled="saving"
        />
        <p v-if="error" class="cal-quick__error" role="alert">{{ error }}</p>
        <div class="cal-quick__actions">
            <button type="button" class="su-btn su-btn--ghost" :disabled="saving" @click="emit('more', title)">
                {{ t('calendarPage.quick.more') }}
            </button>
            <button type="submit" class="su-btn su-btn--ink" :disabled="!title.trim() || saving" :aria-busy="saving || undefined">
                {{ t('calendarPage.quick.create') }}
            </button>
        </div>
    </form>
</template>

<style scoped>
/* encart sur filet 1 px, ombre courte : il flotte au-dessus de la grille sans en masquer le rythme */
.cal-quick {
    position: absolute;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 260px;
    padding: 14px;
    border: 1px solid var(--line);
    background: var(--bg);
    box-shadow: 0 8px 24px rgba(11, 12, 16, 0.12);
    cursor: default;
}

.cal-quick__when {
    margin: 0;
    color: var(--gray);
    font-size: 12.5px;
}

.cal-quick__input {
    width: 100%;
    padding: 0 0 6px;
    border: 0;
    border-bottom: 2px solid var(--ink);
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    outline: none;
}

.cal-quick__input::placeholder {
    color: var(--gray);
    font-weight: 400;
}

.cal-quick__error {
    margin: 0;
    color: var(--danger);
    font-size: 12.5px;
}

.cal-quick__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
</style>
