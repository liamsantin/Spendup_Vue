<script setup lang="ts">
import { ref } from 'vue';
import NotificationsExampleCard from './notifications/NotificationsExampleCard.vue';

/** Exemple local — non branché API. */
const emailDigestEnabled = ref(true);
</script>

<template>
    <div class="notifications-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <NotificationsExampleCard v-model="emailDigestEnabled" />
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.notifications-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
