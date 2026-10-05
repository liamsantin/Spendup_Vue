<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
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
    <AppPageShell :title="t('notificationsPage.title')" :subtitle="t('notificationsPage.subtitle')">
        <template #actions>
            <span v-if="store.hasUnread" class="su-chip">{{ unreadLabel }}</span>
            <button
                type="button"
                class="su-btn"
                :disabled="!store.hasUnread || store.markingAll || store.clearingAll"
                @click="onMarkAllRead"
            >
                {{ t('header.notifications.markAllRead') }}
            </button>
            <button type="button" class="su-btn su-btn--danger" :disabled="!canClearAll" @click="openClearAll">
                {{ t('header.notifications.clearAll') }}
            </button>
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
