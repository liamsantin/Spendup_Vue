<script setup lang="ts">
import { ref } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { AccountProfileCard } from '@/features/settings';

const page = ref({ title: 'Réglages du compte' });
const breadcrumbs = ref([
    { text: 'Application', disabled: false, href: '/app' },
    { text: 'Réglages du compte', disabled: true, href: '/app/account-settings' }
]);
</script>

<template>
    <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />

    <v-row>
        <v-col cols="12" md="8" lg="6">
            <AccountProfileCard />
        </v-col>
    </v-row>
</template>
