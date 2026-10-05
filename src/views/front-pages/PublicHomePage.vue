<script setup lang="ts">
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import SpendupHomeContent from '@/components/frontpages/home/SpendupHomeContent.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <SpendupHomeContent />

        <Footer />
    </div>
</template>
