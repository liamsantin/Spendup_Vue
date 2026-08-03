<script setup>
defineOptions({ name: 'HorizontalNavItem' });

import Icon from '../../vertical-sidebar/Icon.vue';
defineProps({ item: Object, level: Number });
</script>

<template>
    <!---Single Item — exact active pour les racines type `/app` --->
    <router-link :to="`${item.to}`" custom v-slot="{ href, navigate, isActive, isExactActive }">
        <a
            :href="href"
            class="navItemLink rounded-md"
            :class="{ 'router-link-active': item.exact ? isExactActive : isActive }"
            :aria-disabled="item.disabled ? 'true' : undefined"
            @click="item.disabled ? $event.preventDefault() : navigate($event)"
        >
            <i class="navIcon"> <Icon :item="item.icon" :level="level" /></i>
            <span>{{ $t(item.title) }}</span>
            <small v-if="item.subCaption" class="text-caption mt-n1 hide-menu">
                {{ $t(item.subCaption) }}
            </small>
            <template v-if="item.chip">
                <v-chip
                    :color="item.chipColor"
                    class="sidebarchip hide-menu ml-auto"
                    :size="item.chipIcon ? 'small' : 'small'"
                    :variant="item.chipVariant"
                    :prepend-icon="item.chipIcon"
                >
                    {{ item.chip }}
                </v-chip>
            </template>
        </a>
    </router-link>
</template>
