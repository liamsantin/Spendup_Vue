<script setup lang="ts">
import { useAuthStore } from '@/app/stores/auth-store';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const auth = useAuthStore();
</script>

<template>
    <UiParentCard title="Profil (test)">
        <v-list lines="two" class="bg-transparent pa-0">
            <v-list-item>
                <v-list-item-title class="text-subtitle-2 text-medium-emphasis">Identifiant</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 textPrimary">
                    {{ auth.user?.username ?? '—' }}
                </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
                <v-list-item-title class="text-subtitle-2 text-medium-emphasis">Nom</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 textPrimary">
                    {{ auth.user?.firstName }} {{ auth.user?.lastName }}
                </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
                <v-list-item-title class="text-subtitle-2 text-medium-emphasis">Session</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 textPrimary">Connexion de test (sans JWT)</v-list-item-subtitle>
            </v-list-item>
        </v-list>

        <v-btn color="error" variant="tonal" class="text-none mt-4" @click="auth.logout()">Se déconnecter</v-btn>
    </UiParentCard>
</template>
