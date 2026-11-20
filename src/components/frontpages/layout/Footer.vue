<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRightIcon, ArrowUpRightIcon, BrandInstagramIcon, MailIcon } from 'vue-tabler-icons';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';
import { contactEmail } from '@/components/frontpages/contact/contact-form';

/**
 * Footer des landing pages : bloc marque (accroche, e-mail, Instagram) à gauche,
 * colonnes de liens à droite, ligne de mentions puis le grand logotype.
 */
const email = contactEmail();

const instagram = { handle: '@spendupapp', href: 'https://www.instagram.com/spendupapp/' };

const columns = computed(() => [
    {
        title: 'Produit',
        links: [
            { label: 'Fonctionnalités', to: '/fonctionnalites' },
            ...(isPricingPageEnabled() ? [{ label: 'Tarifs', to: '/tarifs' }] : []),
            { label: 'Créer un compte', to: '/auth?tab=register' },
            { label: 'Se connecter', to: '/auth?tab=login' }
        ]
    },
    {
        title: 'Spend.Up',
        links: [
            { label: 'À propos', to: '/a-propos' },
            { label: 'Contact', to: '/contact' }
        ]
    },
    {
        title: 'Légal',
        links: [
            { label: "Conditions d'utilisation", to: '/conditions-utilisation' },
            { label: 'Protection des données', to: '/protection-des-donnees' }
        ]
    }
]);

const year = new Date().getFullYear();
</script>

<template>
    <footer class="landing-footer">
        <v-container class="max-width-1218 landing-footer__content">
            <div class="footer-main">
                <div class="footer-brand">
                    <p class="footer-brand__claim">
                        Toute votre vie financière, <span class="footer-brand__accent">au même endroit.</span>
                    </p>
                    <ul class="footer-brand__reach">
                        <li v-if="email">
                            <a :href="`mailto:${email}`" class="footer-reach">
                                <MailIcon size="20" stroke-width="1.7" />
                                <span>{{ email }}</span>
                            </a>
                        </li>
                        <li>
                            <a :href="instagram.href" target="_blank" rel="noopener noreferrer" class="footer-reach">
                                <BrandInstagramIcon size="20" stroke-width="1.7" />
                                <span>{{ instagram.handle }}</span>
                                <ArrowUpRightIcon size="14" class="footer-reach__ext" />
                                <span class="footer-sr">(Instagram, nouvel onglet)</span>
                            </a>
                        </li>
                    </ul>
                    <div class="footer-brand__actions">
                        <RouterLink to="/contact" class="footer-brand__cta">
                            Nous écrire
                            <ArrowRightIcon size="16" />
                        </RouterLink>
                        <a
                            :href="instagram.href"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="footer-brand__social"
                            aria-label="Spend.Up sur Instagram (nouvel onglet)"
                        >
                            <BrandInstagramIcon size="20" stroke-width="1.7" />
                        </a>
                    </div>
                </div>

                <div class="footer-columns">
                    <nav v-for="column in columns" :key="column.title" class="footer-column" :aria-label="column.title">
                        <h3>{{ column.title }}</h3>
                        <RouterLink v-for="item in column.links" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
                    </nav>
                </div>
            </div>

            <!-- Mobile seulement : le logotype occupe toute la largeur, la mention reste ici -->
            <p class="footer-legal footer-legal--inline">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <rect width="32" height="32" fill="#E4002B" />
                    <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                    <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                </svg>
                © {{ year }} Spend.Up · Tous droits réservés · Développé en Suisse
            </p>
        </v-container>

        <!-- Dernière ligne : le logotype collé en bas à gauche, la mention dans le coin bas droit -->
        <div class="footer-bottom">
            <div class="footer-wordmark" aria-hidden="true">Spend<span class="footer-wordmark__dot">.</span>Up</div>
            <p class="footer-legal footer-legal--corner">© {{ year }} Spend.Up · Tous droits réservés · Développé en Suisse</p>
        </div>
    </footer>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/footer';
</style>
