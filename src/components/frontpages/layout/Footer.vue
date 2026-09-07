<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRightIcon, DatabaseExportIcon, LockIcon, MapPinIcon, ShieldCheckIcon } from 'vue-tabler-icons';
import Logo from '@/layouts/full/logo/Logo.vue';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';

const productLinks = computed(() => [
    { label: 'Fonctionnalités', to: '/fonctionnalites' },
    ...(isPricingPageEnabled() ? [{ label: 'Tarifs', to: '/tarifs' }] : []),
    { label: 'Créer un compte', to: '/auth/register' },
    { label: 'Se connecter', to: '/auth/login' }
]);

const companyLinks = [
    { label: 'À propos', to: '/a-propos' },
    { label: 'Application', to: '/app' },
    { label: 'Télécharger pour Windows', href: '/downloads/SpendUp-Setup-x64.msi' }
];

const legalLinks = [
    { label: "Conditions d'utilisation", to: '/conditions-utilisation' },
    { label: 'Politique de confidentialité', to: '/politique-confidentialite' }
];

const trustItems = [
    { icon: MapPinIcon, label: 'Données en Suisse' },
    { icon: LockIcon, label: '2FA incluse' },
    { icon: DatabaseExportIcon, label: 'Export libre' }
];
</script>

<template>
    <footer class="landing-footer">
        <div class="landing-footer__glow landing-footer__glow--left"></div>
        <div class="landing-footer__glow landing-footer__glow--right"></div>

        <v-container class="max-width-1218 landing-footer__content">
            <div class="footer-cta">
                <div>
                    <span class="footer-cta__kicker">Prêt à y voir plus clair ?</span>
                    <h2>Commencez gratuitement, évoluez à votre rythme.</h2>
                </div>
                <v-btn color="primary" size="large" flat class="text-none px-6" to="/auth/register">
                    Créer mon espace
                    <ArrowRightIcon size="18" class="ms-2" />
                </v-btn>
            </div>

            <div class="footer-main">
                <div class="footer-brand">
                    <Logo home-to="/" />
                    <p>La plateforme suisse qui réunit budget, objectifs et patrimoine dans un espace simple, sécurisé et collaboratif.</p>
                    <div class="footer-trust">
                        <span v-for="item in trustItems" :key="item.label">
                            <component :is="item.icon" size="16" stroke-width="1.7" />
                            {{ item.label }}
                        </span>
                    </div>
                </div>

                <nav class="footer-column" aria-label="Produit">
                    <h3>Produit</h3>
                    <RouterLink v-for="item in productLinks" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
                </nav>

                <nav class="footer-column" aria-label="Spendup">
                    <h3>Spendup</h3>
                    <template v-for="item in companyLinks" :key="item.label">
                        <RouterLink v-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
                        <a v-else :href="item.href" download>{{ item.label }}</a>
                    </template>
                </nav>

                <nav class="footer-column" aria-label="Informations légales">
                    <h3>Légal</h3>
                    <RouterLink v-for="item in legalLinks" :key="item.label" :to="item.to">{{ item.label }}</RouterLink>
                    <div class="footer-security">
                        <ShieldCheckIcon size="18" stroke-width="1.7" />
                        Sécurité incluse dans toutes les offres
                    </div>
                </nav>
            </div>

            <div class="footer-bottom">
                <p>© {{ new Date().getFullYear() }} Spendup. Tous droits réservés.</p>
                <p>Conçu avec soin en Suisse.</p>
            </div>
        </v-container>
    </footer>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/footer';
</style>
