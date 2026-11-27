<script setup lang="ts">
/**
 * Invités d'un événement (phase 4). L'organisateur invite un ami ou un membre de la famille et retire un invité ;
 * un invité répond (accepte, peut-être, refuse). Les erreurs du serveur (réglage « qui peut m'inviter », blocage)
 * s'affichent telles quelles.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { calendarApi } from '@/features/calendar/api';
import { CALENDAR_RSVP_STATUSES, type CalendarParticipantList, type CalendarRsvpStatus } from '@/features/calendar/types';
import { listAllFriends } from '@/features/friends';
import type { FriendItem } from '@/features/friends/types';
import { getErrorMessage } from '@/utils/errors/app-error';

const props = defineProps<{
    eventPublicId: string;
    /** Vrai : l'utilisateur peut modifier l'événement, donc inviter. Faux : il est invité. */
    isOrganizer: boolean;
}>();

const emit = defineEmits<{ responded: [] }>();

const { t } = useI18n();

const list = ref<CalendarParticipantList | null>(null);
const friends = ref<FriendItem[]>([]);
const loading = ref(true);
const acting = ref(false);
const error = ref<string | null>(null);
const picked = ref<string | null>(null);
const message = ref('');

const me = computed(() => useAuthStore().user?.userPublicId ?? null);
const participants = computed(() => (list.value?.items ?? []).filter((p) => p.role !== 'organisateur'));
const myStatus = computed(() => participants.value.find((p) => p.userPublicId && p.userPublicId === me.value)?.status ?? null);
const friendItems = computed(() => {
    const invited = new Set(participants.value.map((p) => p.userPublicId));
    return friends.value.filter((f) => !invited.has(f.user.publicId)).map((f) => ({ title: friendLabel(f), value: f.user.publicId }));
});

function friendLabel(friend: FriendItem): string {
    const full = [friend.user.firstName, friend.user.name].filter(Boolean).join(' ');
    return friend.nickname || full || friend.user.username || friend.user.publicId;
}

function statusLabel(status: string): string {
    return (['invite', ...CALENDAR_RSVP_STATUSES] as string[]).includes(status) ? t(`calendarPage.guests.status.${status}`) : status;
}

async function load() {
    loading.value = true;
    error.value = null;
    try {
        const [participantList, friendList] = await Promise.all([
            calendarApi.participants(props.eventPublicId),
            props.isOrganizer ? listAllFriends() : Promise.resolve([])
        ]);
        list.value = participantList;
        friends.value = friendList;
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

async function run(action: () => Promise<void>) {
    if (acting.value) return;
    acting.value = true;
    error.value = null;
    try {
        await action();
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        acting.value = false;
    }
}

function invite() {
    const userPublicId = picked.value;
    if (!userPublicId) return;
    void run(async () => {
        list.value = await calendarApi.invite(props.eventPublicId, userPublicId, message.value);
        picked.value = null;
        message.value = '';
    });
}

function remove(userPublicId: string | null) {
    if (!userPublicId) return;
    void run(async () => {
        await calendarApi.removeParticipant(props.eventPublicId, userPublicId);
        list.value = await calendarApi.participants(props.eventPublicId);
    });
}

function respond(status: CalendarRsvpStatus) {
    void run(async () => {
        list.value = await calendarApi.respond(props.eventPublicId, status);
        emit('responded');
    });
}

onMounted(() => void load());
watch(
    () => props.eventPublicId,
    () => void load()
);
</script>

<template>
    <section class="cal-guests" :aria-label="t('calendarPage.guests.title')">
        <header class="cal-guests__head">
            <h3>{{ t('calendarPage.guests.title') }}</h3>
            <span v-if="list && participants.length" class="cal-guests__count">
                {{ t('calendarPage.guests.summary', { accepted: list.accepted, maybe: list.maybe, pending: list.pending }) }}
            </span>
        </header>

        <AppAlert v-if="error" type="error" class="mb-2" closable @dismiss="error = null">{{ error }}</AppAlert>
        <div v-if="loading" class="su-loading"><span class="su-spin" /></div>

        <template v-else>
            <div v-if="!isOrganizer" class="cal-guests__rsvp" role="group" :aria-label="t('calendarPage.guests.respond')">
                <button
                    v-for="status in CALENDAR_RSVP_STATUSES"
                    :key="status"
                    type="button"
                    class="su-btn"
                    :class="{ 'su-btn--ink': myStatus === status }"
                    :aria-pressed="myStatus === status"
                    :disabled="acting"
                    @click="respond(status)"
                >
                    {{ t(`calendarPage.guests.answer.${status}`) }}
                </button>
            </div>

            <p v-if="!participants.length" class="cal-guests__hint">{{ t('calendarPage.guests.empty') }}</p>
            <ul v-else class="cal-guests__list">
                <li v-for="p in participants" :key="p.userPublicId ?? p.displayName ?? ''">
                    <span class="cal-guests__name">{{ p.displayName ?? t('calendarPage.guests.unknown') }}</span>
                    <span class="cal-guests__status" :class="`is-${p.status}`">{{ statusLabel(p.status) }}</span>
                    <button
                        v-if="isOrganizer && p.userPublicId"
                        type="button"
                        class="su-link"
                        :disabled="acting"
                        @click="remove(p.userPublicId)"
                    >
                        {{ t('calendarPage.guests.remove') }}
                    </button>
                </li>
            </ul>

            <p v-if="isOrganizer && !friendItems.length" class="cal-guests__hint">
                {{ t('calendarPage.guests.noFriends') }}
                <RouterLink to="/app/friends">{{ t('calendarPage.guests.addFriends') }}</RouterLink>
            </p>
            <div v-else-if="isOrganizer" class="cal-guests__invite">
                <AppSelect
                    v-model="picked"
                    :items="friendItems"
                    item-title="title"
                    item-value="value"
                    :label="t('calendarPage.guests.pick')"
                    hide-details
                />
                <div class="su-field">
                    <label class="su-field__label" for="cal-guests-message">{{ t('calendarPage.guests.message') }}</label>
                    <input id="cal-guests-message" v-model="message" class="su-input" maxlength="500" />
                </div>
                <div class="cal-guests__actions">
                    <button type="button" class="su-btn" :disabled="acting || !picked" @click="invite">
                        {{ t('calendarPage.guests.invite') }}
                    </button>
                </div>
            </div>
        </template>
    </section>
</template>

<style scoped>
.cal-guests {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--line, rgba(0, 0, 0, 0.1));
}

.cal-guests__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
}

.cal-guests__head h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
}

.cal-guests__count,
.cal-guests__hint {
    font-size: 13px;
    opacity: 0.75;
}

.cal-guests__hint {
    margin: 6px 0;
}

.cal-guests__rsvp {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.cal-guests__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
}

.cal-guests__list li {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--line, rgba(0, 0, 0, 0.1));
}

.cal-guests__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cal-guests__status {
    font-size: 13px;
    opacity: 0.75;
}

.cal-guests__status.is-accepte {
    color: var(--success, #2f7d4f);
    opacity: 1;
}

.cal-guests__status.is-refuse {
    text-decoration: line-through;
}

.cal-guests__invite {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
}

.cal-guests__actions {
    display: flex;
    justify-content: flex-end;
}
</style>
