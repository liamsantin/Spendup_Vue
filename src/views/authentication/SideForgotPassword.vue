<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import ResetForm from '@/components/auth/ResetForm.vue';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue';
import { readPasswordResetToken } from '@/features/auth/password-reset-token';

const { t } = useI18n();
const route = useRoute();

/** Recalculé à chaque navigation (forgot ↔ reset partagent ce composant). */
const showReset = computed(() => !!readPasswordResetToken(route));
</script>

<template>
    <div class="pa-3">
        <v-row class="h-100vh mh-100 auth">
            <v-col cols="12" lg="8" xl="8" xxl="9" class="d-lg-flex align-center justify-center authentication position-relative">
                <div class="auth-header pt-sm-6 pt-2 px-sm-6 px-3 pb-sm-6 pb-0">
                    <div class="position-relative"><Logo /></div>
                </div>
                <div class="">
                    <img src="@/assets/images/backgrounds/login-bg.svg" class="position-relative d-none d-lg-flex" alt="login-background" />
                </div>
            </v-col>
            <v-col cols="12" lg="4" xl="4" xxl="3" class="d-flex align-center justify-center">
                <div class="pa-sm-7 pa-4 w-100">
                    <template v-if="showReset">
                        <h2 class="text--darken-2 text-h4 font-weight-bold">{{ t('auth.resetPassword.title') }}</h2>
                        <p class="text-subtitle-1 py-4 text-10">{{ t('auth.resetPassword.subtitle') }}</p>
                        <ResetPasswordForm :key="route.fullPath" />
                    </template>
                    <template v-else>
                        <h2 class="text--darken-2 text-h4 font-weight-bold">{{ t('auth.forgotPassword.title') }}</h2>
                        <p class="text-subtitle-1 pt-2 pb-1 text-10">{{ t('auth.forgotPassword.subtitle') }}</p>
                        <ResetForm />
                    </template>
                    <v-btn size="large" color="lightprimary" to="/auth/login" block class="mt-5 text-primary" flat>
                        {{ t('auth.forgotPassword.backToLogin') }}
                    </v-btn>
                </div>
            </v-col>
        </v-row>
    </div>
</template>
