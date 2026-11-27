<script setup lang="ts">
/**
 * Invitations en attente (`GET /api/calendar/invitations`), au-dessus du calendrier : réponse directe
 * (accepter, refuser) ou ouverture de l'événement. Rien ne s'affiche sans invitation.
 */
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { calendarApi } from '@/features/calendar/api';
import type { CalendarInvitation, CalendarRsvpStatus } from '@/features/calendar/types';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{ version: number }>();
const emit = defineEmits<{ open: [eventPublicId: string]; responded: [] }>();

const { t, locale } = useI18n();

const items = ref<CalendarInvitation[]>([]);
const busy = ref<string | null>(null);
const error = ref<string | null>(null);

function when(item: CalendarInvitation): string {
    try {
        if (item.isFullDay && item.startDate) {
            const [y, m, d] = item.startDate.split('-').map(Number);
            return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(y!, m! - 1, d!));
        }
        if (item.startUtc) {
            return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.startUtc));
        }
    } catch {
        // date illisible : on n'affiche rien
    }
    return '';
}

async function load() {
    try {
        items.value = (await calendarApi.invitations()).items;
    } catch {
        items.value = [];
    }
}

async function respond(item: CalendarInvitation, status: CalendarRsvpStatus) {
    if (busy.value) return;
    busy.value = item.eventPublicId;
    error.value = null;
    try {
        await calendarApi.respond(item.eventPublicId, status);
        items.value = items.value.filter((x) => x.eventPublicId !== item.eventPublicId);
        emit('responded');
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        busy.value = null;
    }
}

onMounted(() => void load());
watch(
    () => props.version,
    () => void load()
);
</script>

<template>
    <AppAlert v-if="items.length || error" type="info" class="cal-alert cal-invites">
        <div class="cal-invites__body">
            <p class="cal-invites__lead">{{ t('calendarPage.invitations.title', { count: items.length }, items.length) }}</p>
            <p v-if="error" class="cal-invites__error" role="alert">{{ error }}</p>
            <ul class="cal-invites__list">
                <li v-for="item in items" :key="item.eventPublicId">
                    <span class="cal-invites__main">
                        <strong>{{ item.title }}</strong>
                        <span class="cal-invites__meta">
                            {{
                                [when(item), item.organizerName ? t('calendarPage.invitations.from', { name: item.organizerName }) : '']
                                    .filter(Boolean)
                                    .join(' · ')
                            }}
                        </span>
                        <span v-if="item.message" class="cal-invites__meta">« {{ item.message }} »</span>
                    </span>
                    <button
                        type="button"
                        class="su-btn su-btn--ink cal-alert__btn"
                        :disabled="busy !== null"
                        @click="respond(item, 'accepte')"
                    >
                        {{ t('calendarPage.guests.answer.accepte') }}
                    </button>
                    <button type="button" class="su-btn cal-alert__btn" :disabled="busy !== null" @click="respond(item, 'refuse')">
                        {{ t('calendarPage.guests.answer.refuse') }}
                    </button>
                    <button type="button" class="su-link" :disabled="busy !== null" @click="emit('open', item.eventPublicId)">
                        {{ t('calendarPage.invitations.open') }}
                    </button>
                </li>
            </ul>
        </div>
    </AppAlert>
</template>

<style scoped>
.cal-invites__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.cal-invites__lead,
.cal-invites__error {
    margin: 0;
}

.cal-invites__error {
    color: var(--danger, #9b2c2c);
}

.cal-invites__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.cal-invites__list li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.cal-invites__main {
    display: flex;
    flex: 1 1 200px;
    flex-direction: column;
    min-width: 0;
}

.cal-invites__meta {
    font-size: 13px;
    opacity: 0.75;
}
</style>
