<script setup lang="ts">
import { ref } from 'vue';
import { UserCircleIcon, BellIcon, LockIcon } from 'vue-tabler-icons';
import { AccountTab, NotificationTab, SecurityTab } from '@/features/settings';

const tab = ref('Account');
</script>

<template>
    <div class="settings-page">
        <v-card elevation="10" rounded="md" class="settings-page-card">
            <v-tabs v-model="tab" bg-color="grey100" density="comfortable" height="52" color="primary" class="settings-tabs flex-grow-0">
                <v-tab value="Account" class="text-medium-emphasis">
                    <UserCircleIcon class="mr-2" size="18" />
                    Compte
                </v-tab>
                <v-tab value="Notification" class="text-medium-emphasis">
                    <BellIcon class="mr-2" size="18" />
                    Notifications
                </v-tab>
                <v-tab value="Security" class="text-medium-emphasis">
                    <LockIcon class="mr-2" size="18" />
                    Sécurité
                </v-tab>
            </v-tabs>

            <v-divider class="flex-grow-0" />

            <perfect-scrollbar class="settings-tabs-scroll">
                <v-card-text class="pa-sm-6 pa-3">
                    <v-window v-model="tab">
                        <v-window-item value="Account">
                            <AccountTab />
                        </v-window-item>
                        <v-window-item value="Notification">
                            <NotificationTab />
                        </v-window-item>
                        <v-window-item value="Security">
                            <SecurityTab />
                        </v-window-item>
                    </v-window>
                </v-card-text>
            </perfect-scrollbar>

            <v-divider class="flex-grow-0" />

            <div class="settings-actions-bar">
                <v-btn color="primary" class="mr-3" flat>Enregistrer</v-btn>
                <v-btn class="bg-lighterror text-error" flat>Annuler</v-btn>
            </div>
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

.settings-tabs :deep(.v-tab) {
    min-height: 52px;
    font-size: 0.875rem;
}

.settings-tabs-scroll {
    flex: 1 1 auto;
    min-height: 0;
    height: 0;
}

.settings-actions-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px;
    background: rgb(var(--v-theme-surface));
}
</style>
