<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAppHomeTarget } from '@/utils/helpers/navigation-helpers';

const { t } = useI18n();
const homeTo = useAppHomeTarget();
</script>

<template>
    <div class="d-flex justify-center align-center text-center h-100">
        <div>
            <img src="@/assets/images/backgrounds/maintenance.svg" width="500" alt="under_construction" />
            <h1 class="text-h1">{{ t('auth.pages.errorTitle') }}</h1>
            <h4 class="text-h4 my-8">{{ t('auth.pages.maintenanceBody') }}</h4>
            <v-btn flat color="primary" class="mb-4" :to="homeTo">{{ t('auth.pages.backHome') }}</v-btn>
        </div>
    </div>
</template>
