<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellIcon } from 'vue-tabler-icons';
import AppPageShell from '@/components/shared/AppPageShell.vue';
import { InboxTab, useNotificationsStore } from '@/features/notifications';

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
    <AppPageShell :title="t('notificationsPage.title')" :subtitle="t('notificationsPage.subtitle')" :icon="BellIcon">
        <template #actions>
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
        </template>

        <InboxTab />
    </AppPageShell>
</template>
