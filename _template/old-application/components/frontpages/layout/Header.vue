<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import Navigations from './Navigation.vue';
import { Menu2Icon } from 'vue-tabler-icons';

const HEADER_HEIGHT = 80;

/** Menu déroulant mobile/tablette */
const menuOpen = ref(false);

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
    syncScrollState();
});

onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
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
            color="white"
            flat
            fixed
            elevation="0"
            :class="{ 'front-lp-header--scrolled': isScrolled }"
        >
            <v-container class="py-0 max-content">
                <v-toolbar class="d-flex align-center">
                    <div class="flex-shrink-0">
                        <Logo home-to="/" />
                    </div>

                    <div class="header-actions ms-auto d-flex align-center ga-2">
                        <div class="d-lg-flex d-none align-center">
                            <Navigations :mobile="false" />
                        </div>
                        <v-btn
                            class="custom-hover-primary bg-primary d-md-flex d-none text-white h-43 px-5 transform-none flex-shrink-0"
                            flat
                            to="/auth/login"
                        >
                            <span class="text-white">Connexion</span>
                        </v-btn>

                        <!-- Menu déroulant : visible mobile & tablette (d-lg-none), masqué en PC -->
                        <div class="d-lg-none">
                            <v-menu
                                v-model="menuOpen"
                                class="front-nav-menu"
                                location="bottom end"
                                :close-on-content-click="true"
                                offset="8"
                            >
                                <template #activator="{ props: menuProps }">
                                    <v-btn
                                        v-bind="menuProps"
                                        variant="text"
                                        class="front-nav-burger flex-shrink-0"
                                        icon
                                        aria-label="Ouvrir le menu"
                                        @click.stop
                                    >
                                        <Menu2Icon size="22" stroke-width="1.5" />
                                    </v-btn>
                                </template>

                                <Navigations dropdown />
                            </v-menu>
                        </div>

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

        <div class="front-header-spacer" aria-hidden="true" />

        <!-- Drawer latéral — conservé pour usage futur -->
        <v-navigation-drawer v-if="useDrawerNav" v-model="appsdrawer" class="lp-drawer" location="left" temporary width="300">
            <Navigations mobile />
        </v-navigation-drawer>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/header';
</style>
