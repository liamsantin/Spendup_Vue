<script setup lang="ts">
defineProps({
    title: String
});
</script>

// ===============================|| Ui Parent Card||=============================== //
<template>
    <v-card elevation="10">
        <v-card-item class="py-4 px-4 px-sm-6">
            <div class="d-sm-flex align-center justify-space-between">
                <v-card-title class="text-h5">{{ title }}</v-card-title>
                <!-- <template v-slot:append> -->
                <slot name="action"></slot>
                <!-- </template> -->
            </div>
        </v-card-item>
        <v-divider></v-divider>
        <v-card-text>
            <slot />
        </v-card-text>
    </v-card>
</template>
