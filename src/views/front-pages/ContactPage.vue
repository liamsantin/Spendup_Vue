<script setup lang="ts">
import AnnounceBar from '@/components/frontpages/layout/AnnounceBar.vue';
import Header from '@/components/frontpages/layout/Header.vue';
import Footer from '@/components/frontpages/layout/Footer.vue';
import SpendupContactContent from '@/components/frontpages/contact/SpendupContactContent.vue';
</script>

<template>
    <div class="front-wraper">
        <AnnounceBar />
        <Header />

        <main>
            <SpendupContactContent />
        </main>

        <Footer />
    </div>
</template>
