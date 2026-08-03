<!-- ===============================|| Blank Layout ||=============================== -->
<template>
    <v-app>
        <main id="main-content" tabindex="-1">
            <RouterView />
        </main>
    </v-app>
</template>
<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>
