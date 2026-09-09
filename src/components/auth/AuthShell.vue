<script setup lang="ts">
import { ShieldCheckIcon, SparklesIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import Logo from '@/layouts/full/logo/Logo.vue';

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
    <div class="auth-shell">
        <div class="auth-shell__glow auth-shell__glow--north" aria-hidden="true" />
        <div class="auth-shell__glow auth-shell__glow--east" aria-hidden="true" />
        <div class="auth-shell__ring" aria-hidden="true" />

        <div class="auth-shell__layout">
            <aside class="auth-shell__brand su-hero-in">
                <Logo home-to="/" />
                <div class="auth-shell__eyebrow">
                    <SparklesIcon :size="15" stroke-width="1.8" />
                    {{ t('auth.pages.brandEyebrow') }}
                </div>
                <i18n-t keypath="auth.pages.welcomeSubtitle" tag="h1" class="auth-shell__headline">
                    <template #accent>
                        <span>{{ t('auth.pages.welcomeSubtitleAccent') }}</span>
                    </template>
                </i18n-t>

                <p class="auth-shell__assurance">
                    <ShieldCheckIcon :size="16" stroke-width="1.8" />
                    {{ t('auth.pages.assurance') }}
                </p>
            </aside>

            <div class="auth-shell__stage su-hero-visual-in">
                <div class="auth-shell__mobile-logo">
                    <Logo home-to="/" />
                </div>

                <section class="auth-shell__card su-surface">
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
    </div>
</template>
