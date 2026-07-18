<script setup lang="ts">
import type { Component } from 'vue';
import { CircleCheckIcon } from 'vue-tabler-icons';
import type { DomainCard } from '@/data/front-pages/spendup-additional-domains';

defineProps<{
    icon: Component;
    title: string;
    lead: string;
    footer?: string;
    items?: string[];
    cards?: DomainCard[];
    bgClass: 'bg-lightprimary' | 'bg-surface';
    image: string;
    imageAlt: string;
    imageClass?: string;
    reversed?: boolean;
}>();
</script>

<template>
    <section class="py-12 py-md-16" :class="bgClass">
        <v-container class="max-width-1218">
            <div class="su-domain-layout" :class="{ 'su-domain-layout--reversed': reversed }">
                <div class="su-domain-layout__image">
                    <img :src="image" :alt="imageAlt" :class="['w-100 rounded-xl su-domain-layout-img', imageClass]" loading="lazy" />
                </div>

                <div class="su-domain-layout__content">
                    <div class="su-domain-layout__header text-center mb-8">
                        <div class="su-icon-wrap su-icon-wrap--lg rounded-xl d-inline-flex mb-5">
                            <component :is="icon" size="32" class="text-primary" stroke-width="1.5" />
                        </div>
                        <h3 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">{{ title }}</h3>
                        <p class="text-16 text-medium-emphasis lh-lg mb-0 mx-auto su-domain-layout__lead">{{ lead }}</p>
                        <p
                            v-if="footer && !cards?.length && !items?.length"
                            class="text-15 text-medium-emphasis lh-lg mt-4 mb-0 font-weight-medium"
                        >
                            {{ footer }}
                        </p>
                    </div>
                    <v-row v-if="cards?.length" class="su-domain-cards">
                        <v-col v-for="(card, idx) in cards" :key="idx" cols="12" :md="cards.length === 1 ? 12 : 6">
                            <v-sheet v-if="card.sheetClass" rounded="xl" :class="[card.sheetClass, 'pa-6 h-100']">
                                <div class="su-icon-wrap rounded-lg mb-4" :class="{ 'su-icon-wrap--surface': card.sheetClass }">
                                    <component :is="card.icon" size="22" :class="card.toneClass ?? 'text-primary'" stroke-width="1.5" />
                                </div>
                                <h4 class="text-h5 font-weight-bold textPrimary mb-3">{{ card.title }}</h4>
                                <p v-if="card.intro" class="text-14 text-medium-emphasis lh-lg mb-3">{{ card.intro }}</p>
                                <div v-for="(text, j) in card.items" :key="j" class="d-flex align-start ga-3 mb-2">
                                    <div
                                        class="su-check-bubble rounded-md flex-shrink-0 d-flex align-center justify-center"
                                        :class="{ 'su-check-bubble--surface': card.sheetClass }"
                                    >
                                        <CircleCheckIcon size="16" :class="card.toneClass ?? 'text-primary'" stroke-width="1.5" />
                                    </div>
                                    <p class="text-14 text-medium-emphasis lh-lg mb-0">{{ text }}</p>
                                </div>
                            </v-sheet>

                            <v-card v-else class="su-card pa-6 rounded-xl border h-100" elevation="0">
                                <div class="su-icon-wrap rounded-lg mb-4">
                                    <component :is="card.icon" size="22" class="text-primary" stroke-width="1.5" />
                                </div>
                                <h4 class="text-h5 font-weight-bold textPrimary mb-3">{{ card.title }}</h4>
                                <p v-if="card.intro" class="text-14 text-medium-emphasis lh-lg mb-3">{{ card.intro }}</p>
                                <div v-for="(text, j) in card.items" :key="j" class="d-flex align-start ga-3 mb-2">
                                    <div class="su-check-bubble rounded-md flex-shrink-0 d-flex align-center justify-center">
                                        <CircleCheckIcon size="16" class="text-primary" stroke-width="1.5" />
                                    </div>
                                    <p class="text-14 text-medium-emphasis lh-lg mb-0">{{ text }}</p>
                                </div>
                            </v-card>
                        </v-col>

                        <v-col v-if="items?.length" cols="12" class="mt-4">
                            <v-card class="su-card pa-6 rounded-xl border h-100" elevation="0">
                                <div v-for="(text, i) in items" :key="i" class="d-flex align-start ga-3 mb-2">
                                    <div class="su-check-bubble rounded-md flex-shrink-0 d-flex align-center justify-center">
                                        <CircleCheckIcon size="16" class="text-primary" stroke-width="1.5" />
                                    </div>
                                    <p class="text-14 text-medium-emphasis lh-lg mb-0">{{ text }}</p>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>

                    <v-card v-else-if="items?.length" class="su-card pa-6 rounded-xl border w-100" elevation="0">
                        <div v-for="(text, i) in items" :key="i" class="d-flex align-start ga-3 mb-2">
                            <div class="su-check-bubble rounded-md flex-shrink-0 d-flex align-center justify-center">
                                <CircleCheckIcon size="16" class="text-primary" stroke-width="1.5" />
                            </div>
                            <p class="text-14 text-medium-emphasis lh-lg mb-0">{{ text }}</p>
                        </div>
                    </v-card>

                    <p
                        v-if="footer && (cards?.length || items?.length)"
                        class="text-15 text-medium-emphasis lh-lg mt-4 mb-0 font-weight-medium"
                    >
                        {{ footer }}
                    </p>
                </div>
            </div>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/spendup-shared';
</style>
