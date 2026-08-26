<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import ConfirmEmailChangeForm from '@/components/auth/ConfirmEmailChangeForm.vue';
import { useAuthStore } from '@/features/auth';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

/** Depuis l’app (définition / confirmation d’e-mail) vs flux auth public. */
const fromApp = computed(() => route.query.from === 'app' || auth.isAuthenticated);

const backLabel = computed(() => (fromApp.value ? t('auth.confirmEmailChange.backToApp') : t('auth.confirmEmailChange.backToLogin')));
const backTo = computed(() => (fromApp.value ? '/app/comptes' : '/auth/login'));
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
                    <h2 class="text--darken-2 text-h4 font-weight-bold">{{ t('auth.confirmEmailChange.title') }}</h2>
                    <ConfirmEmailChangeForm />
                    <v-btn size="large" color="lightprimary" :to="backTo" block class="mt-5 text-primary" flat>
                        {{ backLabel }}
                    </v-btn>
                </div>
            </v-col>
        </v-row>
    </div>
</template>
