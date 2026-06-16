<script setup lang="ts">
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import ContactBar from '@/components/frontpages/shared/ContactBar.vue';
import TextBannerCard from '@/components/frontpages/shared/TextBannerCard.vue';
import SpendupFeaturesContent from '@/components/frontpages/features/SpendupFeaturesContent.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <TextBannerCard
            title="Fonctionnalités"
            caption="Une plateforme complète pour piloter vos finances personnelles, familiales et patrimoniales."
        />

        <SpendupFeaturesContent />

        <ContactBar />
        <Footer />
    </div>
</template>
