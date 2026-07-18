<script setup lang="ts">
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import ContactBar from '@/components/frontpages/shared/ContactBar.vue';
import SpendupTeamSection from '@/components/frontpages/about/SpendupTeamSection.vue';
import SpendupAboutProjectNotice from '@/components/frontpages/about/SpendupAboutProjectNotice.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <SpendupTeamSection />
        <SpendupAboutProjectNotice />

        <ContactBar />
        <Footer />
    </div>
</template>
