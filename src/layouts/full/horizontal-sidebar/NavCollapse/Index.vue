<script setup>
defineOptions({ name: 'HorizontalNavCollapse' });

import { ChevronDownIcon } from 'vue-tabler-icons';
import NavItem from '../NavItem/Index.vue';
import Icon from '../../vertical-sidebar/Icon.vue';

defineProps({ item: Object, level: Number });
</script>

<template>
    <!---Dropdown  -->
    <a class="navItemLink rounded-md cursor-pointer">
        <!---Icon  -->
        <i class="navIcon"><Icon :item="item.icon" :level="level" /></i>
        <!---Title  -->
        <span class="mr-auto">{{ $t(item.title) }}</span>
        <!---If Caption-->
        <small v-if="item.subCaption" class="text-caption mt-n1 hide-menu">
            {{ $t(item.subCaption) }}
        </small>
        <i class="ddIcon ml-2 d-flex align-center"><ChevronDownIcon size="15" /></i>
    </a>
    <!---Sub Item-->
    <ul v-if="item.children" :class="`ddMenu ddLevel-${level + 1}`">
        <li v-for="(subitem, i) in item.children" :key="i" class="navItem">
            <Index :item="subitem" v-if="subitem.children" :level="level + 1" />
            <NavItem :item="subitem" :level="level + 1" v-else></NavItem>
        </li>
    </ul>
    <!---End Item Sub Header -->
</template>
