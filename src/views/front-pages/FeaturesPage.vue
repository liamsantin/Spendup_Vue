<script setup lang="ts">
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import SpendupFeaturesContent from '@/components/frontpages/features/SpendupFeaturesContent.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <main>
            <SpendupFeaturesContent />
        </main>

        <Footer />
    </div>
</template>
