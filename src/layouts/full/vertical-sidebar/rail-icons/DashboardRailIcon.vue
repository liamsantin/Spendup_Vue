<script setup lang="ts">
defineOptions({ name: 'DashboardRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon name="dashboard" :size="size" />
</template>
