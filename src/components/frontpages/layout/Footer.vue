<script setup lang="ts">
import { computed } from 'vue';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';

/** Footer réduit : deux colonnes de liens (site, légal), les mentions et le grand logotype. */
const columns = computed(() => [
    {
        title: 'Spend.Up',
        links: [
            { label: 'Fonctionnalités', to: '/fonctionnalites' },
            ...(isPricingPageEnabled() ? [{ label: 'Tarifs', to: '/tarifs' }] : []),
            { label: 'À propos', to: '/a-propos' },
            { label: 'Contact', to: '/contact' }
        ]
    },
    {
        title: 'Légal',
        links: [
            { label: "Conditions d'utilisation", to: '/conditions-utilisation' },
            { label: 'Politique de confidentialité', to: '/politique-confidentialite' }
        ]
    }
]);

const year = new Date().getFullYear();
</script>

<template>
    <footer class="landing-footer">
        <v-container class="max-width-1218 landing-footer__content">
            <div class="footer-main">
                <div class="footer-columns">
                    <nav v-for="column in columns" :key="column.title" class="footer-column" :aria-label="column.title">
                        <h3>{{ column.title }}</h3>
                        <RouterLink v-for="item in column.links" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
                    </nav>
                </div>
                <p class="footer-meta">
                    <svg viewBox="0 0 32 32" aria-hidden="true">
                        <rect width="32" height="32" fill="#E4002B" />
                        <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                        <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                    </svg>
                    © {{ year }} Spend.Up · Développé en Suisse
                </p>
            </div>
        </v-container>

        <div class="footer-wordmark" aria-hidden="true">Spend<span class="footer-wordmark__dot">.</span>Up</div>
    </footer>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/footer';
</style>
