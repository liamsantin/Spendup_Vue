<script setup lang="ts">
/**
 * Partage des calendriers (phase 4). Mes calendriers : partager à un ami (libre / occupé, lecture, écriture, gestion),
 * changer le niveau, retirer. Calendriers partagés avec moi : masquer, quitter. Les calendriers Famille ne se partagent pas.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSelect from '@/components/shared/select/AppSelect.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { calendarApi } from '@/features/calendar/api';
import { CALENDAR_SHARE_PERMISSIONS, type CalendarInfo, type CalendarShare } from '@/features/calendar/types';
import { listAllFriends } from '@/features/friends';
import type { FriendItem } from '@/features/friends/types';
import { getErrorMessage } from '@/utils/errors/app-error';

const { t } = useI18n();

const calendars = ref<CalendarInfo[]>([]);
const shares = ref<Record<string, CalendarShare[]>>({});
const friends = ref<FriendItem[]>([]);
const drafts = ref<Record<string, { userPublicId: string | null; permission: string }>>({});
const loading = ref(true);
const busy = ref(false);
const error = ref<string | null>(null);

const owned = computed(() => calendars.value.filter((c) => c.isOwner && c.calendarType !== 'famille'));
const received = computed(() => calendars.value.filter((c) => !c.isOwner && c.calendarType !== 'famille'));
const permissionItems = computed(() =>
    CALENDAR_SHARE_PERMISSIONS.map((value) => ({ title: t(`calendarPage.sharing.permissions.${value}`), value }))
);

function friendLabel(friend: FriendItem): string {
    const full = [friend.user.firstName, friend.user.name].filter(Boolean).join(' ');
    return friend.nickname || full || friend.user.username || friend.user.publicId;
}

function friendItemsFor(calendarPublicId: string) {
    const taken = new Set((shares.value[calendarPublicId] ?? []).map((s) => s.userPublicId));
    return friends.value.filter((f) => !taken.has(f.user.publicId)).map((f) => ({ title: friendLabel(f), value: f.user.publicId }));
}

function permissionLabel(permission: string): string {
    return (CALENDAR_SHARE_PERMISSIONS as readonly string[]).includes(permission)
        ? t(`calendarPage.sharing.permissions.${permission}`)
        : permission;
}

async function load() {
    loading.value = true;
    error.value = null;
    try {
        const [list, friendList] = await Promise.all([calendarApi.calendars(), listAllFriends()]);
        calendars.value = list.items;
        friends.value = friendList;
        const mine = list.items.filter((c) => c.isOwner && c.calendarType !== 'famille');
        const loaded = await Promise.all(mine.map((c) => calendarApi.shares(c.publicId)));
        shares.value = Object.fromEntries(mine.map((c, i) => [c.publicId, loaded[i]!.items]));
        drafts.value = Object.fromEntries(mine.map((c) => [c.publicId, { userPublicId: null, permission: 'read' }]));
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        loading.value = false;
    }
}

async function run(action: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        await action();
    } catch (e) {
        error.value = getErrorMessage(e);
    } finally {
        busy.value = false;
    }
}

async function refreshShares(calendarPublicId: string) {
    shares.value = { ...shares.value, [calendarPublicId]: (await calendarApi.shares(calendarPublicId)).items };
}

function add(calendarPublicId: string) {
    const draft = drafts.value[calendarPublicId];
    if (!draft?.userPublicId) return;
    const userPublicId = draft.userPublicId;
    void run(async () => {
        await calendarApi.share(calendarPublicId, userPublicId, draft.permission);
        await refreshShares(calendarPublicId);
        draft.userPublicId = null;
    });
}

function change(calendarPublicId: string, share: CalendarShare, permission: string) {
    if (permission === share.permission) return;
    void run(async () => {
        await calendarApi.share(calendarPublicId, share.userPublicId, permission);
        await refreshShares(calendarPublicId);
    });
}

function revoke(calendarPublicId: string, share: CalendarShare) {
    void run(async () => {
        await calendarApi.unshare(calendarPublicId, share.userPublicId);
        await refreshShares(calendarPublicId);
    });
}

function setHidden(calendar: CalendarInfo, isHidden: boolean) {
    void run(async () => {
        const updated = await calendarApi.updateMyShare(calendar.publicId, { isHidden });
        calendars.value = calendars.value.map((c) => (c.publicId === calendar.publicId ? updated : c));
    });
}

function leave(calendar: CalendarInfo) {
    void run(async () => {
        await calendarApi.leaveShare(calendar.publicId);
        calendars.value = calendars.value.filter((c) => c.publicId !== calendar.publicId);
    });
}

onMounted(() => void load());
</script>

<template>
    <section v-if="!loading" class="su-settings cal-sharing">
        <div class="su-settings__lead">
            <h2>{{ t('calendarPage.sharing.title') }}</h2>
            <p>{{ t('calendarPage.sharing.hint') }}</p>
        </div>
        <div class="su-settings__fields">
            <p v-if="error" class="cal-sharing__error is-full" role="alert">{{ error }}</p>

            <div v-for="calendar in owned" :key="calendar.publicId" class="cal-sharing__calendar is-full">
                <h3>{{ calendar.name }}</h3>
                <ul v-if="shares[calendar.publicId]?.length" class="cal-list">
                    <li v-for="share in shares[calendar.publicId]" :key="share.userPublicId" class="cal-list__item">
                        <span class="cal-list__main">
                            <span class="cal-list__title">{{ share.displayName }}</span>
                        </span>
                        <AppSelect
                            class="cal-sharing__level"
                            :model-value="share.permission"
                            :items="permissionItems"
                            item-title="title"
                            item-value="value"
                            :label="t('calendarPage.sharing.level')"
                            :disabled="busy"
                            hide-details
                            @update:model-value="change(calendar.publicId, share, String($event))"
                        />
                        <button type="button" class="su-btn su-btn--ghost" :disabled="busy" @click="revoke(calendar.publicId, share)">
                            {{ t('calendarPage.sharing.revoke') }}
                        </button>
                    </li>
                </ul>
                <p v-else class="cal-sharing__empty">{{ t('calendarPage.sharing.none') }}</p>

                <p v-if="!friendItemsFor(calendar.publicId).length" class="cal-sharing__empty">
                    {{ t('calendarPage.guests.noFriends') }}
                    <RouterLink to="/app/friends">{{ t('calendarPage.guests.addFriends') }}</RouterLink>
                </p>
                <div v-else-if="drafts[calendar.publicId]" class="cal-sharing__add">
                    <AppSelect
                        v-model="drafts[calendar.publicId]!.userPublicId"
                        :items="friendItemsFor(calendar.publicId)"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.sharing.friend')"
                        hide-details
                    />
                    <AppSelect
                        v-model="drafts[calendar.publicId]!.permission"
                        :items="permissionItems"
                        item-title="title"
                        item-value="value"
                        :label="t('calendarPage.sharing.level')"
                        hide-details
                    />
                    <button
                        type="button"
                        class="su-btn"
                        :disabled="busy || !drafts[calendar.publicId]!.userPublicId"
                        @click="add(calendar.publicId)"
                    >
                        {{ t('calendarPage.sharing.share') }}
                    </button>
                </div>
            </div>

            <div v-if="received.length" class="cal-sharing__calendar is-full">
                <h3>{{ t('calendarPage.sharing.received') }}</h3>
                <ul class="cal-list">
                    <li v-for="calendar in received" :key="calendar.publicId" class="cal-list__item">
                        <span class="cal-list__main">
                            <span class="cal-list__title">{{ calendar.name }}</span>
                            <span class="cal-list__meta">{{ permissionLabel(calendar.permission) }}</span>
                        </span>
                        <label class="cal-sharing__toggle">
                            <span>{{ t('calendarPage.sharing.visible') }}</span>
                            <AppSwitch
                                :model-value="!calendar.isHidden"
                                :disabled="busy"
                                @update:model-value="setHidden(calendar, !$event)"
                            />
                        </label>
                        <button type="button" class="su-btn su-btn--ghost" :disabled="busy" @click="leave(calendar)">
                            {{ t('calendarPage.sharing.leave') }}
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </section>
</template>

<style scoped>
.cal-sharing__calendar h3 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
}

.cal-sharing__level {
    max-width: 200px;
}

.cal-sharing__add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 200px) auto;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
}

@media (max-width: 600px) {
    .cal-sharing__add {
        grid-template-columns: 1fr;
    }
}

.cal-sharing__toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.cal-sharing__empty {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.cal-sharing__error {
    margin: 0;
    color: var(--danger, #9b2c2c);
    font-size: 14px;
}
</style>
