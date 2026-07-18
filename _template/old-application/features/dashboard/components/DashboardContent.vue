<script setup lang="ts">
import { LayoutDashboardIcon } from 'vue-tabler-icons';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useDashboardModules } from '../composables/useDashboardModules';

const { modules } = useDashboardModules();
</script>

<template>
    <v-row class="mb-4">
        <v-col cols="12">
            <v-alert type="info" variant="tonal" border="start" rounded="lg" class="mb-0">
                <div class="d-flex align-start ga-3">
                    <LayoutDashboardIcon size="28" class="text-primary flex-shrink-0 mt-1" stroke-width="1.5" />
                    <div>
                        <p class="text-subtitle-1 font-weight-semibold textPrimary mb-1">Espace authentifié Spend.Up</p>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                            Page de test après connexion. Les modules ci-dessous préfigurent la structure de l'application
                            (<code>/app</code>). L'authentification JWT sera branchée ultérieurement.
                        </p>
                    </div>
                </div>
            </v-alert>
        </v-col>
    </v-row>

    <v-row>
        <v-col v-for="mod in modules" :key="mod.title" cols="12" sm="6" lg="4">
            <UiParentCard :title="mod.title">
                <div class="d-flex flex-column ga-3">
                    <div class="su-icon-wrap rounded-lg d-inline-flex align-center justify-center" style="width: 48px; height: 48px">
                        <component :is="mod.icon" size="24" class="text-primary" stroke-width="1.5" />
                    </div>
                    <p class="text-body-2 text-medium-emphasis mb-0">{{ mod.caption }}</p>
                    <v-btn
                        :to="mod.disabled ? undefined : mod.to"
                        :disabled="mod.disabled"
                        color="primary"
                        variant="tonal"
                        class="text-none align-self-start"
                        size="small"
                    >
                        {{ mod.disabled ? 'Bientôt disponible' : 'Ouvrir' }}
                    </v-btn>
                </div>
            </UiParentCard>
        </v-col>
    </v-row>
</template>
