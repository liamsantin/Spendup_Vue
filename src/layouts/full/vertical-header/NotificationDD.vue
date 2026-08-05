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
            <v-btn icon variant="text" color="primary" class="custom-hover-primary" v-bind="props">
                <v-badge :content="notifications.badgeContent" :model-value="notifications.hasUnread" color="primary">
                    <BellRingingIcon stroke-width="1.5" size="22" />
                </v-badge>
            </v-btn>
        </template>
        <v-sheet rounded="md" width="360" elevation="10">
            <div class="px-8 pb-4 pt-6">
                <div class="d-flex align-center justify-space-between">
                    <h6 class="text-h5">{{ t('header.notifications.title') }}</h6>
                    <div class="d-flex align-center ga-1">
                        <v-chip v-if="notifications.hasUnread" color="primary" variant="flat" size="small" class="text-white">
                            {{ unreadLabel }}
                        </v-chip>
                        <v-btn
                            icon
                            variant="text"
                            color="primary"
                            size="small"
                            class="custom-hover-primary"
                            :loading="notifications.markingAll"
                            :disabled="!notifications.hasUnread || notifications.markingAll"
                            :aria-label="t('header.notifications.markAllRead')"
                            :title="t('header.notifications.markAllRead')"
                            @click="onMarkAllRead"
                        >
                            <ChecksIcon stroke-width="1.5" size="20" />
                        </v-btn>
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
                <v-list class="py-0 theme-list" lines="two">
                    <v-list-item
                        v-for="item in notifications.items"
                        :key="item.id"
                        :value="item.id"
                        color="primary"
                        class="py-4 px-8"
                        :class="{ 'bg-lightprimary': !item.isRead }"
                        @click="onItemClick(item)"
                    >
                        <template #prepend>
                            <UserPhotoAvatar class="mr-3" :photo-url="item.photoUrl" :fallback-label="item.title" :size="48" />
                        </template>
                        <div>
                            <h6 class="text-subtitle-1 font-weight-bold mb-1">{{ item.title }}</h6>
                        </div>
                        <p class="text-subtitle-1 font-weight-regular textSecondary mb-0">
                            {{ item.subtitle || item.message || formatCreatedAt(item.createdAt) }}
                        </p>
                    </v-list-item>
                </v-list>
            </perfect-scrollbar>

            <div class="py-4 px-6 text-center">
                <v-btn color="primary" variant="outlined" block :to="'/app/notifications'" @click="closeMenu">
                    {{ t('header.notifications.viewAll') }}
                </v-btn>
            </div>
        </v-sheet>
    </v-menu>
</template>
