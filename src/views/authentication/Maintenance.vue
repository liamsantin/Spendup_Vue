<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { APP_HOME_ROUTE, useAuthStore } from '@/features/auth';
import { useAppHomeTarget } from '@/utils/helpers/navigation-helpers';

const { t } = useI18n();
const auth = useAuthStore();
const homeTo = useAppHomeTarget();
/** Session gardée pendant une panne de l'API : « Réessayer » retourne là où la personne allait. */
const retryTo = computed(() => (auth.isAuthenticated ? auth.returnUrl || APP_HOME_ROUTE : null));
</script>

<template>
    <div class="d-flex justify-center align-center text-center h-100">
        <div>
            <img src="@/assets/images/backgrounds/maintenance.svg" width="500" alt="under_construction" />
            <h1 class="text-h1">{{ t('auth.pages.errorTitle') }}</h1>
            <h4 class="text-h4 my-8">{{ t('auth.pages.maintenanceBody') }}</h4>
            <v-btn v-if="retryTo" flat color="primary" class="mb-4 mr-2" :to="retryTo">{{ t('common.retry') }}</v-btn>
            <v-btn flat :color="retryTo ? undefined : 'primary'" class="mb-4" :to="homeTo">{{ t('auth.pages.backHome') }}</v-btn>
        </div>
    </div>
</template>
