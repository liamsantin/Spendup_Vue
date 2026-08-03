<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellIcon } from 'vue-tabler-icons';
import { InboxTab, useNotificationsStore } from '@/features/notifications';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

const { t } = useI18n();
const store = useNotificationsStore();

const unreadLabel = computed(() => t('notificationsPage.unreadCount', { count: store.unreadCount }));

async function onMarkAllRead() {
    try {
        await store.markAllRead();
    } catch {
        // store.error
    }
}
</script>

<template>
    <div class="settings-page">
        <v-card elevation="10" rounded="md" class="settings-page-card">
            <div class="notifications-page-header">
                <div class="d-flex align-center ga-3 min-width-0">
                    <v-avatar class="bg-lightprimary text-primary flex-shrink-0" rounded="md" size="48">
                        <BellIcon size="24" />
                    </v-avatar>
                    <div class="min-width-0">
                        <h4 class="text-h4 mb-0">{{ t('notificationsPage.title') }}</h4>
                        <div class="text-subtitle-1 textSecondary mt-1 text-truncate">
                            {{ t('notificationsPage.subtitle') }}
                        </div>
                    </div>
                </div>
                <div class="d-flex align-center ga-2 flex-shrink-0">
                    <v-chip v-if="store.hasUnread" color="primary" variant="flat" size="small" class="text-white">
                        {{ unreadLabel }}
                    </v-chip>
                    <v-btn
                        color="primary"
                        variant="outlined"
                        :loading="store.markingAll"
                        :disabled="!store.hasUnread || store.markingAll"
                        @click="onMarkAllRead"
                    >
                        {{ t('header.notifications.markAllRead') }}
                    </v-btn>
                </div>
            </div>

            <perfect-scrollbar class="settings-tabs-scroll" :options="PERFECT_SCROLLBAR_OPTIONS">
                <v-card-text class="pa-sm-6 pa-3">
                    <InboxTab />
                </v-card-text>
            </perfect-scrollbar>
        </v-card>
    </div>
</template>

<style scoped>
.settings-page {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.settings-page-card {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.notifications-page-header {
    flex-grow: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 24px;
    background: rgb(var(--v-theme-grey100));
}

.settings-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

@media screen and (max-width: 767px) {
    .settings-page {
        width: 100vw;
        margin-left: calc(50% - 50vw);
    }

    .settings-page-card {
        border-radius: 0 !important;
    }

    .notifications-page-header {
        padding: 16px;
    }
}
</style>
