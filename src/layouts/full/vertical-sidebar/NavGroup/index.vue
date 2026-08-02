<script setup lang="ts">
defineOptions({ name: 'NavGroupTitle' });

import { DotsIcon } from 'vue-tabler-icons';
import type { menu } from '../sidebarItem';

defineProps<{ item: menu }>();
</script>

<template>
    <v-list-subheader class="smallCap text-uppercase text-subtitle-2 mt-5 font-weight-bold d-flex align-items-center">
        <span class="mini-icon"><DotsIcon size="16" stroke-width="1.5" class="iconClass" /></span>
        <span class="mini-text">{{ $t(item.header ?? '') }}</span>
    </v-list-subheader>
</template>
