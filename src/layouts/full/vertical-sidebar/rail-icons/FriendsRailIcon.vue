<script setup lang="ts">
defineOptions({ name: 'FriendsRailIcon' });

import RailIcon from './RailIcon.vue';

withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
    <RailIcon name="friends" :size="size" />
</template>
