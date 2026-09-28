<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRightIcon, ArrowUpIcon, BrandWindowsIcon, DatabaseExportIcon, LockIcon, MailIcon, ShieldCheckIcon } from 'vue-tabler-icons';
import infomaniakLogo from '@/assets/images/front-pages/infomaniak-logo.svg';
import Logo from '@/layouts/full/logo/Logo.vue';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';

const INSTALLER_PATH = '/downloads/SpendUp-Setup-x64.msi';
const windowsDownloadUrl = (import.meta.env.VITE_WINDOWS_APP_DOWNLOAD_URL as string | undefined)?.trim() || INSTALLER_PATH;

const columns = computed(() => [
    {
        title: 'Produit',
        links: [
            { label: 'Fonctionnalités', to: '/fonctionnalites' },
            ...(isPricingPageEnabled() ? [{ label: 'Tarifs', to: '/tarifs' }] : []),
            { label: 'Hébergement en Suisse', to: '/#hebergement' },
            { label: 'Questions fréquentes', to: '/#questions' }
        ]
    },
    {
        title: 'Spendup',
        links: [
            { label: 'À propos', to: '/a-propos' },
            { label: 'Contact', to: '/contact' },
            { label: 'Se connecter', to: '/auth?tab=login' },
            { label: 'Créer un compte', to: '/auth?tab=register' }
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

const trustItems = [
    { icon: LockIcon, label: '2FA incluse' },
    { icon: DatabaseExportIcon, label: 'Export libre' },
    { icon: ShieldCheckIcon, label: 'Conforme nLPD' }
];

const year = new Date().getFullYear();

function scrollToTop() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
</script>

<template>
    <footer class="landing-footer">
        <div class="landing-footer__glow landing-footer__glow--left" aria-hidden="true"></div>
        <div class="landing-footer__glow landing-footer__glow--right" aria-hidden="true"></div>

        <v-container class="max-width-1218 landing-footer__content">
            <!-- appel à l'action -->
            <div class="footer-cta">
                <div>
                    <h2>Prêt à y voir clair dans vos finances ?</h2>
                    <p>Créez votre espace en moins d’une minute. Gratuit, sans carte bancaire, sans engagement.</p>
                </div>
                <div class="footer-cta__actions">
                    <v-btn color="primary" size="large" flat class="text-none px-6" to="/auth?tab=register">
                        Commencer gratuitement
                        <ArrowRightIcon size="18" class="ms-2" />
                    </v-btn>
                    <v-btn variant="outlined" size="large" class="text-none px-6 footer-cta__ghost" to="/contact">
                        <MailIcon size="18" class="me-2" />
                        Nous contacter
                    </v-btn>
                </div>
            </div>

            <div class="footer-main">
                <div class="footer-brand">
                    <Logo home-to="/" />
                    <p>La plateforme suisse qui réunit budget, objectifs et patrimoine dans un espace simple, sécurisé et collaboratif.</p>

                    <RouterLink to="/#hebergement" class="footer-hosting" aria-label="Données hébergées en Suisse chez Infomaniak">
                        <svg viewBox="0 0 32 32" aria-hidden="true">
                            <rect width="32" height="32" rx="7" fill="#DA291C" />
                            <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                            <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                        </svg>
                        <span>
                            <small>Données hébergées en Suisse chez</small>
                            <img :src="infomaniakLogo" alt="Infomaniak" width="244" height="32" />
                        </span>
                    </RouterLink>

                    <div class="footer-trust">
                        <span v-for="item in trustItems" :key="item.label">
                            <component :is="item.icon" size="15" stroke-width="1.8" />
                            {{ item.label }}
                        </span>
                    </div>
                </div>

                <nav v-for="column in columns" :key="column.title" class="footer-column" :aria-label="column.title">
                    <h3>{{ column.title }}</h3>
                    <RouterLink v-for="item in column.links" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
                </nav>

                <div class="footer-app">
                    <h3>Application</h3>
                    <p>Dans votre navigateur, sur ordinateur comme sur smartphone, ou en application Windows.</p>
                    <a :href="windowsDownloadUrl" download class="footer-app__download">
                        <BrandWindowsIcon size="20" />
                        <span>
                            <small>Télécharger pour</small>
                            Windows 10 / 11
                        </span>
                    </a>
                    <RouterLink to="/app" class="footer-app__web">Ouvrir l’application web <ArrowRightIcon size="15" /></RouterLink>
                </div>
            </div>

            <div class="footer-bottom">
                <p>© {{ year }} Spendup. Tous droits réservés.</p>
                <p class="footer-bottom__made">
                    <svg viewBox="0 0 32 32" aria-hidden="true">
                        <rect width="32" height="32" rx="7" fill="#DA291C" />
                        <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                        <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                    </svg>
                    Conçu avec soin en Suisse
                </p>
                <button type="button" class="footer-top" @click="scrollToTop">
                    Haut de page
                    <ArrowUpIcon size="15" />
                </button>
            </div>
        </v-container>

        <div class="footer-wordmark" aria-hidden="true">Spendup</div>
    </footer>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/footer';
</style>
