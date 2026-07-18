<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import { isPricingPageEnabled } from '@/utils/pricing-page-enabled';

const props = withDefaults(
    defineProps<{
        /** Navigation horizontale desktop (lg+) */
        mobile?: boolean;
        /** Menu déroulant mobile/tablette (remplace le drawer) */
        dropdown?: boolean;
    }>(),
    { mobile: false, dropdown: false }
);

const route = useRoute();

const navigation = computed(() => {
    const items = [
        { menu: 'Accueil', href: '/', badge: false },
        { menu: 'Fonctionnalités', href: '/fonctionnalites', badge: false },
        { menu: "Conditions d'utilisation", href: '/conditions-utilisation', badge: false },
        { menu: 'Politique de confidentialité', href: '/politique-confidentialite', badge: false },
        ...(isPricingPageEnabled() ? [{ menu: 'Tarifs', href: '/tarifs', badge: false }] : []),
        { menu: 'À propos', href: '/a-propos', badge: false }
    ];
    return items;
});

const isActive = (href: string) => route.path === href || (href !== '/' && route.path.startsWith(href));

const linkClass = (href: string) => [
    'text-15 font-weight-medium text-decoration-none text-hover-primary d-flex align-center ga-2 px-3 py-lg-1 py-2',
    props.mobile ? 'w-100' : 'flex-shrink-0',
    isActive(href) ? 'text-primary light-primary rounded-md' : ''
];
</script>

<template>
    <nav v-if="!mobile && !dropdown" class="front-nav front-nav--desktop d-flex align-center flex-wrap ga-2">
        <RouterLink v-for="(item, i) in navigation" :key="i" :to="item.href" :class="linkClass(item.href)">
            {{ item.menu }}
            <v-chip v-if="item.badge" rounded="md" class="font-weight-semibold h-23" color="primary" size="small" label> New </v-chip>
        </RouterLink>
    </nav>

    <v-list v-else-if="dropdown" class="front-nav-dropdown py-2" density="comfortable" nav>
        <v-list-item
            v-for="(item, i) in navigation"
            :key="i"
            :to="item.href"
            :active="isActive(item.href)"
            rounded="md"
            color="primary"
            class="text-15"
        >
            <v-list-item-title class="font-weight-medium">{{ item.menu }}</v-list-item-title>
            <template v-if="item.badge" #append>
                <v-chip rounded="md" class="font-weight-semibold h-23" color="primary" size="small" label>New</v-chip>
            </template>
        </v-list-item>

        <v-divider class="my-2" />

        <div class="front-nav-dropdown__login px-3 pb-2">
            <v-btn class="custom-hover-primary bg-primary text-white h-43 px-5 transform-none" flat block to="/auth/login">
                <span class="text-white">Connexion</span>
            </v-btn>
        </div>
    </v-list>

    <div v-else class="front-nav front-nav--mobile d-flex flex-column w-100 ga-4 pa-6">
        <div class="mb-2">
            <Logo home-to="/" />
        </div>

        <RouterLink v-for="(item, i) in navigation" :key="i" :to="item.href" :class="linkClass(item.href)">
            {{ item.menu }}
            <v-chip v-if="item.badge" rounded="md" class="font-weight-semibold h-23" color="primary" size="small" label> New </v-chip>
        </RouterLink>

        <v-btn class="custom-hover-primary bg-primary d-flex w-100 text-white h-43 px-5 transform-none mt-2" flat to="/auth/login">
            <span class="text-white">Connexion</span>
        </v-btn>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/navigation';
</style>
