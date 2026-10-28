<script setup lang="ts">
/**
 * Cadre des pages d’authentification, aligné sur les landings : en-tête, grille, panneau à filet.
 */
import { useI18n } from 'vue-i18n';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';

defineOptions({ name: 'AuthShell' });

withDefaults(
    defineProps<{
        title?: string;
        subtitle?: string;
    }>(),
    {
        title: undefined,
        subtitle: undefined
    }
);

const { t } = useI18n();
</script>

<template>
    <div class="front-wraper auth-shell">
        <AnnounceBar />
        <Header />

        <main class="auth-page">
            <div class="s-container">
                <div class="s-grid auth-page__layout">
                    <aside class="auth-page__copy">
                        <span class="s-kicker"><b>01</b> {{ t('auth.pages.brandEyebrow') }}</span>
                        <i18n-t keypath="auth.pages.welcomeSubtitle" tag="h1" class="s-display">
                            <template #accent>
                                <span class="s-primary">{{ t('auth.pages.welcomeSubtitleAccent') }}</span>
                            </template>
                        </i18n-t>
                        <p class="auth-page__note">{{ t('auth.pages.assurance') }}</p>
                    </aside>

                    <section class="auth-page__panel">
                        <slot name="tabs" />

                        <header v-if="title || subtitle || $slots.header" class="auth-shell__head">
                            <slot name="header">
                                <h2 v-if="title">{{ title }}</h2>
                                <p v-if="subtitle">{{ subtitle }}</p>
                            </slot>
                        </header>

                        <div class="auth-shell__body">
                            <slot />
                        </div>

                        <footer v-if="$slots.footer" class="auth-shell__foot">
                            <slot name="footer" />
                        </footer>

                        <slot name="overlay" />
                    </section>
                </div>
            </div>
        </main>
    </div>
</template>
