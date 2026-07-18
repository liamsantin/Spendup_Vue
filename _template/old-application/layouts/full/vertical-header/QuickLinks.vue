<script setup lang="ts">
import { quickLink } from '@/data/admin/headerData';
</script>

<template>
    <!-- ---------------------------------------------- -->
    <!-- language DD -->
    <!-- ---------------------------------------------- -->
    <div v-for="(item, i) in quickLink" :key="i" class="py-2">
        <router-link :to="item.href" class="text-decoration-none text-hover-primary font-weight-semibold text-subtitle-1">{{
            item.title
        }}</router-link>
    </div>
</template>
