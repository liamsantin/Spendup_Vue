<script setup lang="ts">
defineProps({
    caption: String,
    title: String
});
</script>
<template>
    <div class="overflow-hidden bg-lightprimary pt-sm-12 pt-0 pb-sm-16 pb-8">
        <v-container class="max-width-1218 text-center py-12">
            <span class="text-banner-card__caption text-uppercase text-primary font-weight-bold pb-4 d-block">{{ caption }}</span>
            <h1 class="text-banner-card__title font-weight-bold textPrimary mb-0">{{ title }}</h1>
        </v-container>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/shared/text-banner-card';
</style>
