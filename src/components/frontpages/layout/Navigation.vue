<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import Logo from '@/layouts/full/logo/Logo.vue';
import { isPricingPageEnabled } from '@/utils/helpers/pricing-helpers';

const props = withDefaults(
    defineProps<{
        /** Navigation horizontale desktop (lg+) */
        mobile?: boolean;
        /** Menu déroulant mobile/tablette (remplace le drawer) */
        dropdown?: boolean;
    }>(),
    { mobile: false, dropdown: false }
);

const emit = defineEmits<{ navigate: [] }>();

const route = useRoute();

const navigation = computed(() => {
    const items = [
        { menu: 'Accueil', href: '/', badge: false },
        { menu: 'Fonctionnalités', href: '/fonctionnalites', badge: false },
        ...(isPricingPageEnabled() ? [{ menu: 'Tarifs', href: '/tarifs', badge: false }] : []),
        { menu: 'À propos', href: '/a-propos', badge: false },
        { menu: 'Contact', href: '/contact', badge: false }
    ];
    return items;
});

const isActive = (href: string) => (href === '/' ? route.path === '/' : route.path.startsWith(href));

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

    <nav v-else-if="dropdown" class="front-nav-dropdown" aria-label="Menu principal">
        <ul class="front-nav-dropdown__links">
            <li v-for="(item, i) in navigation" :key="i">
                <RouterLink
                    :to="item.href"
                    :aria-current="isActive(item.href) ? 'page' : undefined"
                    :class="{ 'is-active': isActive(item.href) }"
                    @click="emit('navigate')"
                >
                    {{ item.menu }}
                </RouterLink>
            </li>
        </ul>

        <div class="front-nav-dropdown__actions">
            <v-btn class="text-none" size="x-large" flat block to="/auth?tab=register" @click="emit('navigate')">Créer un compte</v-btn>
            <v-btn class="text-none" size="x-large" variant="outlined" block to="/auth?tab=login" @click="emit('navigate')">
                Connexion
            </v-btn>
        </div>
    </nav>

    <div v-else class="front-nav front-nav--mobile d-flex flex-column w-100 ga-4 pa-6">
        <div class="mb-2">
            <Logo home-to="/" />
        </div>

        <RouterLink v-for="(item, i) in navigation" :key="i" :to="item.href" :class="linkClass(item.href)">
            {{ item.menu }}
            <v-chip v-if="item.badge" rounded="md" class="font-weight-semibold h-23" color="primary" size="small" label> New </v-chip>
        </RouterLink>

        <v-btn class="custom-hover-primary bg-primary d-flex w-100 text-white h-43 px-5 transform-none mt-2" flat to="/auth?tab=login">
            <span class="text-white">Connexion</span>
        </v-btn>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/layout/navigation';
</style>
