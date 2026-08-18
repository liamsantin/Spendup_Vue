<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellIcon } from 'vue-tabler-icons';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import { InboxTab, useNotificationsStore } from '@/features/notifications';

const { t } = useI18n();
const store = useNotificationsStore();
const clearAllOpen = ref(false);

const unreadLabel = computed(() => t('notificationsPage.unreadCount', { count: store.unreadCount }));
const canClearAll = computed(() => store.hasItems && !store.clearingAll);

async function onMarkAllRead() {
    try {
        await store.markAllRead();
    } catch {
        // store.error
    }
}

function openClearAll() {
    if (!canClearAll.value) return;
    clearAllOpen.value = true;
}

async function confirmClearAll() {
    try {
        await store.clearAll();
        clearAllOpen.value = false;
    } catch {
        // store.error — garder la modale ouverte
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
                :disabled="!store.hasUnread || store.markingAll || store.clearingAll"
                @click="onMarkAllRead"
            >
                {{ t('header.notifications.markAllRead') }}
            </v-btn>
            <v-btn color="error" variant="outlined" :loading="store.clearingAll" :disabled="!canClearAll" @click="openClearAll">
                {{ t('header.notifications.clearAll') }}
            </v-btn>
        </template>

        <InboxTab />

        <AppConfirmationModal
            v-model="clearAllOpen"
            :title="t('notificationsPage.clearAllModal.title')"
            :message="t('notificationsPage.clearAllModal.body')"
            :confirm-label="t('notificationsPage.clearAllModal.confirm')"
            confirm-color="error"
            :loading="store.clearingAll"
            @confirm="confirmClearAll"
        />
    </AppPageShell>
</template>
