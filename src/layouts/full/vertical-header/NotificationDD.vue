<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { BellRingingIcon, ChecksIcon } from 'vue-tabler-icons';
import { UserPhotoAvatar } from '@/features/friends';
import { resolveNotificationLink, useNotificationsStore } from '@/features/notifications';
import type { AppNotification } from '@/features/notifications';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';
import { useHeaderMenuOverlay } from './useHeaderMenuOverlay';

const { t, locale } = useI18n();
const router = useRouter();
const notifications = useNotificationsStore();
const { scrim, opacity } = useHeaderMenuOverlay();
const menuOpen = ref(false);

const unreadLabel = computed(() => t('header.notifications.newCount', { count: notifications.unreadCount }));

function formatCreatedAt(iso: string): string {
    try {
        return new Intl.DateTimeFormat(locale.value || undefined, {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function formatRelativeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const totalMinutes = Math.max(0, Math.floor((Date.now() - then) / 60_000));
    if (totalMinutes < 1) return t('header.notifications.ago.justNow');
    if (totalMinutes < 60) return t('header.notifications.ago.minutes', { count: totalMinutes });
    if (totalMinutes < 24 * 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return t('header.notifications.ago.hours', { value: `${hours}h${String(minutes).padStart(2, '0')}` });
    }
    return t('header.notifications.ago.days', { count: Math.floor(totalMinutes / (24 * 60)) });
}

async function onMenuUpdate(open: boolean) {
    menuOpen.value = open;
    if (open) {
        try {
            await notifications.openInbox();
        } catch {
            // erreur affichée via store.error
        }
    }
}

function closeMenu() {
    menuOpen.value = false;
}

async function onMarkAllRead() {
    if (!notifications.hasUnread || notifications.markingAll) return;
    try {
        await notifications.markAllRead();
    } catch {
        // erreur via store.error
    }
}

async function onItemClick(item: AppNotification) {
    closeMenu();
    // Ne pas afficher le chip live une fois que l’utilisateur agit depuis le dropdown.
    notifications.dismissLiveFriendChipsByNotificationId(item.id);
    if (!item.isRead) {
        try {
            await notifications.markRead(item.id);
        } catch {
            // navigation quand même si link
        }
    }
    const target = resolveNotificationLink(item.link, item);
    if (target) {
        await router.push(target);
    }
}
</script>

<template>
    <v-menu :model-value="menuOpen" :close-on-content-click="false" :scrim="scrim" :opacity="opacity" @update:model-value="onMenuUpdate">
        <template #activator="{ props }">
            <button type="button" class="su-orb" v-bind="props" :aria-label="t('header.notifications.title')">
                <v-badge class="header-notif-badge" :content="notifications.badgeContent" :model-value="notifications.hasUnread">
                    <BellRingingIcon stroke-width="1.5" :size="20" />
                </v-badge>
            </button>
        </template>
        <v-sheet rounded="md" width="360" elevation="0" class="su-menu">
            <div class="px-8 pb-4 pt-6">
                <div class="d-flex align-center justify-space-between">
                    <h6 class="text-h5">{{ t('header.notifications.title') }}</h6>
                    <div class="d-flex align-center ga-1">
                        <span v-if="notifications.hasUnread" class="su-chip">{{ unreadLabel }}</span>
                        <button
                            type="button"
                            class="su-orb"
                            :disabled="!notifications.hasUnread || notifications.markingAll"
                            :aria-label="t('header.notifications.markAllRead')"
                            :title="t('header.notifications.markAllRead')"
                            @click="onMarkAllRead"
                        >
                            <span v-if="notifications.markingAll" class="su-spin notification-dd__spin" aria-hidden="true" />
                            <ChecksIcon v-else stroke-width="1.5" size="20" />
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="notifications.loading" class="px-8 py-6 text-center text-medium-emphasis">
                {{ t('header.notifications.loading') }}
            </div>
            <div v-else-if="notifications.error" class="px-8 py-4 text-error text-body-2">
                {{ notifications.error }}
            </div>
            <div v-else-if="!notifications.items.length" class="px-8 py-6 text-center text-medium-emphasis">
                {{ t('header.notifications.empty') }}
            </div>
            <perfect-scrollbar v-else style="height: 280px" :options="PERFECT_SCROLLBAR_OPTIONS">
                <div class="px-2 py-1">
                    <button
                        v-for="item in notifications.items"
                        :key="item.id"
                        type="button"
                        class="su-person"
                        :class="{ 'is-focused': !item.isRead }"
                        @click="onItemClick(item)"
                    >
                        <UserPhotoAvatar :photo-url="item.photoUrl" :fallback-label="item.title" :size="44" />
                        <div class="su-person__meta">
                            <div class="notification-dd__when">
                                <p class="notification-dd__time">{{ formatCreatedAt(item.createdAt) }}</p>
                                <p class="notification-dd__ago">{{ formatRelativeAgo(item.createdAt) }}</p>
                            </div>
                            <p class="su-person__name">{{ item.title }}</p>
                            <p v-if="item.subtitle || item.message" class="su-person__sub">{{ item.subtitle || item.message }}</p>
                        </div>
                    </button>
                </div>
            </perfect-scrollbar>

            <div class="py-4 px-6 text-center">
                <router-link class="su-btn su-btn--ink notification-dd__view-all" to="/app/notifications" @click="closeMenu">
                    {{ t('header.notifications.viewAll') }}
                </router-link>
            </div>
        </v-sheet>
    </v-menu>
</template>

<style scoped>
.header-notif-badge :deep(.v-badge__badge) {
    background: rgb(var(--v-theme-primary)) !important;
    color: #fff !important;
    border: 0;
    box-shadow: 0 6px 14px -10px rgba(var(--v-theme-primary), 0.45);
    font-weight: 600;
}

.notification-dd__when {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 2px;
}

.notification-dd__time,
.notification-dd__ago {
    margin: 0;
    color: var(--ink-mute);
    font-size: 10.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
    white-space: nowrap;
}

.notification-dd__time {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.notification-dd__ago {
    flex: none;
}

.notification-dd__spin {
    width: 18px;
    height: 18px;
}

.notification-dd__view-all {
    width: 100%;
    box-shadow: 0 8px 18px -14px rgba(var(--v-theme-primary), 0.35);
}

.notification-dd__view-all:hover {
    box-shadow: 0 10px 22px -12px rgba(var(--v-theme-primary), 0.42);
}
</style>
