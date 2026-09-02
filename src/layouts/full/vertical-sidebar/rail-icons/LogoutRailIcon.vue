<script setup lang="ts">
defineOptions({ name: 'LogoutRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon name="logout" :size="size" />
</template>
