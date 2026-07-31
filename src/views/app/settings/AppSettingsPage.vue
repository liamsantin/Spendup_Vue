<script setup lang="ts">
import { ref } from 'vue';
import { UserCircleIcon, BellIcon, LockIcon } from 'vue-tabler-icons';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { AccountTab, NotificationTab, SecurityTab } from '@/features/settings';

const tab = ref('Account');

const page = ref({ title: 'Paramètres' });
const breadcrumbs = ref([
    { text: 'Application', disabled: false, href: '/app' },
    { text: 'Paramètres', disabled: true, href: '/app/parametres' }
]);
</script>

<template>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
    <v-row class="justify-center">
        <v-col cols="12" md="12">
            <v-card elevation="10" rounded="md">
                <v-tabs v-model="tab" bg-color="transparent" min-height="70" height="70" color="primary">
                    <v-tab value="Account" class="text-medium-emphasis">
                        <UserCircleIcon class="mr-2" size="20" />
                        Compte
                    </v-tab>
                    <v-tab value="Notification" class="text-medium-emphasis">
                        <BellIcon class="mr-2" size="20" />
                        Notifications
                    </v-tab>
                    <v-tab value="Security" class="text-medium-emphasis">
                        <LockIcon class="mr-2" size="20" />
                        Sécurité
                    </v-tab>
                </v-tabs>
                <v-divider></v-divider>
                <v-card-text class="pa-sm-6 pa-3 pb-sm-6 pb-6">
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
            </v-card>
        </v-col>
    </v-row>
</template>
