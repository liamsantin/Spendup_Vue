<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { BellIcon } from 'vue-tabler-icons';
import AppTabsShell from '@/components/shared/AppTabsShell.vue';
import { InboxTab } from '@/features/notifications';

const { t } = useI18n();

const tab = ref('Inbox');

const tabs = computed(() => [{ value: 'Inbox', label: t('notificationsPage.tabs.inbox'), icon: BellIcon }]);
</script>

<template>
    <AppTabsShell v-model="tab" :tabs="tabs" align-tabs="center" hide-actions>
        <v-window v-model="tab">
            <v-window-item value="Inbox">
                <InboxTab />
            </v-window-item>
        </v-window>
    </AppTabsShell>
</template>
