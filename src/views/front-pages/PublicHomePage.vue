<script setup lang="ts">
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import ContactBar from '@/components/frontpages/shared/ContactBar.vue';
import SpendupHomeContent from '@/components/frontpages/home/SpendupHomeContent.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <SpendupHomeContent />

        <ContactBar />
        <Footer />
    </div>
</template>
