<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { AUTH_ROUTE, useAuthStore } from '@/features/auth';
import AuthShell from '@/components/auth/AuthShell.vue';
import LoginForm from '@/components/auth/LoginForm.vue';
import RegisterForm from '@/components/auth/RegisterForm.vue';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue';
import AuthProcessingOverlay from '@/components/auth/AuthProcessingOverlay.vue';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const googleProcessing = ref(false);
const googleError = ref<string | null>(null);
const isRegister = ref(false);

function queryTab(): string | undefined {
    const raw = route.query.tab;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' ? value : undefined;
}

watch(
    () => queryTab(),
    (tab) => {
        if (tab === 'register') isRegister.value = true;
        else if (tab === 'login') isRegister.value = false;
        if (tab === 'login' || tab === 'register') {
            void router.replace({ path: AUTH_ROUTE });
        }
    },
    { immediate: true }
);

const title = computed(() => t(isRegister.value ? 'auth.pages.registerTitle' : 'auth.pages.loginTitle'));
const subtitle = computed(() => t(isRegister.value ? 'auth.pages.registerSubtitle' : 'auth.pages.loginSubtitle'));
const googleLabel = computed(() => t(isRegister.value ? 'auth.google.signUp' : 'auth.google.signIn'));

async function onGoogleCredential(idToken: string) {
    googleError.value = null;
    googleProcessing.value = true;
    try {
        await authStore.loginWithGoogle(idToken);
    } catch (error: unknown) {
        googleError.value = error instanceof Error ? error.message : String(error);
        googleProcessing.value = false;
    }
}
</script>

<template>
    <AuthShell :title="title" :subtitle="subtitle">
        <template #tabs>
            <nav class="su-tabs auth-shell__tabs" :aria-label="t('auth.pages.welcomeTitle')">
                <button
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': !isRegister }"
                    :aria-selected="!isRegister"
                    @click="isRegister = false"
                >
                    {{ t('auth.pages.tabLogin') }}
                </button>
                <button
                    type="button"
                    class="su-tab"
                    :class="{ 'is-active': isRegister }"
                    :aria-selected="isRegister"
                    @click="isRegister = true"
                >
                    {{ t('auth.pages.tabRegister') }}
                </button>
            </nav>
        </template>

        <AppAlert v-if="googleError" type="error" class="mb-4">{{ googleError }}</AppAlert>

        <GoogleSignInButton class="mb-6" :label="googleLabel" @credential="onGoogleCredential" />

        <div class="auth-divider">
            <span>{{ t('auth.login.or') }}</span>
        </div>

        <LoginForm v-show="!isRegister" :inert="isRegister" />
        <RegisterForm v-show="isRegister" :inert="!isRegister" />

        <template #overlay>
            <AuthProcessingOverlay
                :active="googleProcessing"
                :title="t('auth.google.finalizingTitle')"
                :subtitle="t('auth.google.finalizingSubtitle')"
            />
        </template>
    </AuthShell>
</template>
