<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AuthShell from '@/components/auth/AuthShell.vue';
import TwoStepForm from '@/components/auth/TwoStepForm.vue';

const { t } = useI18n();
</script>

<template>
    <AuthShell :title="t('auth.twoStep.title')" :subtitle="t('auth.twoStep.subtitle')">
        <TwoStepForm />
    </AuthShell>
</template>
