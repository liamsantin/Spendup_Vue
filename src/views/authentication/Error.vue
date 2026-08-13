<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAppHomeTarget } from '@/utils/helpers/navigation-helpers';

const { t } = useI18n();
const homeTo = useAppHomeTarget();
</script>

<template>
    <div class="d-flex justify-center align-center text-center h-100vh">
        <div>
            <img src="@/assets/images/backgrounds/errorimg.svg" width="500" alt="404" />
            <h1 class="text-h1 pt-3">{{ t('auth.pages.errorTitle') }}</h1>
            <h4 class="text-h4 my-8">{{ t('auth.pages.errorNotFound') }}</h4>
            <v-btn flat color="primary" class="mb-4" :to="homeTo">{{ t('auth.pages.backHome') }}</v-btn>
        </div>
    </div>
</template>
