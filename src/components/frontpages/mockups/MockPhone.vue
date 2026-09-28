<script setup lang="ts">
/**
 * Smartphone générique affichant Spendup **dans le navigateur mobile** (application web) :
 * caméra ponctuelle, barre d'état neutre et barre d'adresse sécurisée. Dimensionné en `em`.
 */
import { MOCK_APP_HOST } from './format';

withDefaults(defineProps<{ time?: string }>(), { time: '9:41' });
</script>

<template>
    <div class="mk-phone">
        <div class="mk-phone__screen">
            <div class="mk-phone__status">
                <span class="mk-phone__time">{{ time }}</span>
                <span class="mk-phone__camera"></span>
                <span class="mk-phone__icons">
                    <i class="mk-phone__signal"><b></b><b></b><b></b><b></b></i>
                    <i class="mk-phone__battery"><b></b></i>
                </span>
            </div>
            <div class="mk-phone__browser">
                <span class="mk-phone__omnibox">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    {{ MOCK_APP_HOST }}
                </span>
                <span class="mk-phone__tabs" aria-hidden="true">2</span>
            </div>
            <div class="mk-phone__content">
                <slot />
            </div>
            <span class="mk-phone__home"></span>
        </div>
    </div>
</template>
