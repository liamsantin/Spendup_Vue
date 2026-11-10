<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import Navigations from './Navigation.vue';
import { ArrowRightIcon, Menu2Icon, XIcon } from 'vue-tabler-icons';

const HEADER_HEIGHT = 80;

/** Menu mobile/tablette : panneau plein écran sous l’en-tête */
const menuOpen = ref(false);

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') menuOpen.value = false;
}

// Bloque le défilement de la page tant que le menu est ouvert
watch(menuOpen, (open) => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
});

/** Drawer latéral — conservé pour usage futur (désactivé) */
const appsdrawer = ref(false);
const useDrawerNav = false;

const isScrolled = ref(false);
const route = useRoute();

function handleScroll() {
    isScrolled.value = window.scrollY > 0;
}

function syncScrollState() {
    handleScroll();
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', onKeydown);
    syncScrollState();
});

onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('keydown', onKeydown);
    document.documentElement.style.overflow = '';
});

watch(
    () => route.fullPath,
    () => {
        menuOpen.value = false;
        appsdrawer.value = false;
        syncScrollState();
    }
);
</script>

<template>
    <div class="front-header">
        <v-app-bar
            :height="HEADER_HEIGHT"
            class="front-lp-header"
            :color="isScrolled || menuOpen ? 'white' : 'transparent'"
            flat
            fixed
            elevation="0"
            :class="{ 'front-lp-header--scrolled': isScrolled || menuOpen }"
        >
            <v-container class="py-0 max-content">
                <v-toolbar class="d-flex align-center">
                    <div class="flex-shrink-0">
                        <Logo home-to="/" />
                    </div>

                    <div class="header-nav-center d-lg-flex d-none align-center">
                        <Navigations :mobile="false" />
                    </div>

                    <div class="header-actions ms-auto d-flex align-center ga-2">
                        <v-btn
                            class="header-login d-md-flex d-none text-none h-43 px-4 flex-shrink-0"
                            variant="text"
                            color="textPrimary"
                            to="/auth?tab=login"
                        >
                            Connexion
                        </v-btn>
                        <v-btn
                            class="header-cta d-md-flex d-none text-none h-43 px-5 flex-shrink-0"
                            color="primary"
                            flat
                            to="/auth?tab=register"
                        >
                            Créer un compte
                            <ArrowRightIcon size="17" class="ms-2" />
                        </v-btn>

                        <!-- Bouton du menu : visible mobile & tablette (d-lg-none), masqué en PC -->
                        <v-btn
                            variant="text"
                            class="front-nav-burger d-lg-none flex-shrink-0"
                            icon
                            :aria-label="menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
                            :aria-expanded="menuOpen"
                            aria-controls="front-mobile-menu"
                            @click="menuOpen = !menuOpen"
                        >
                            <XIcon v-if="menuOpen" size="24" stroke-width="1.6" />
                            <Menu2Icon v-else size="24" stroke-width="1.6" />
                        </v-btn>

                        <!-- Bouton drawer legacy (si réactivation de useDrawerNav) -->
                        <v-btn
                            v-if="useDrawerNav"
                            variant="text"
                            class="hidden-lg-and-up flex-shrink-0"
                            icon
                            aria-label="Ouvrir le menu latéral"
                            @click.stop="appsdrawer = !appsdrawer"
                        >
                            <Menu2Icon size="22" stroke-width="1.5" />
                        </v-btn>
                    </div>
                </v-toolbar>
            </v-container>
        </v-app-bar>

        <!-- Menu mobile : panneau plein écran, grands liens alignés à gauche -->
        <Transition name="front-mobile-menu">
            <div v-if="menuOpen" id="front-mobile-menu" class="front-mobile-menu d-lg-none" :style="{ top: `${HEADER_HEIGHT}px` }">
                <Navigations dropdown @navigate="menuOpen = false" />
            </div>
        </Transition>

        <!-- Drawer latéral — conservé pour usage futur -->
        <v-navigation-drawer v-if="useDrawerNav" v-model="appsdrawer" class="lp-drawer" location="left" temporary width="300">
            <Navigations mobile />
        </v-navigation-drawer>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/header';
</style>
