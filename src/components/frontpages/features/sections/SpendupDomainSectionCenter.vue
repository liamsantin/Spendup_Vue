<script setup lang="ts">
import { CircleCheckIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import type { DomainCard } from '@/data/front-pages/spendup-additional-domains';

defineProps<{
    chip?: string;
    title: string;
    lead: string;
    cards: DomainCard[];
    bgClass: 'bg-lightprimary' | 'bg-surface';
    image: string;
    imageAlt: string;
    imageClass?: string;
    alert?: string;
    ctaLabel?: string;
    ctaTo?: string;
}>();
</script>

<template>
    <section class="py-12 py-md-16" :class="bgClass">
        <v-container class="max-width-1218">
            <div class="su-domain-center__header text-center mb-8 mb-md-10">
                <v-chip v-if="chip" color="primary" variant="tonal" rounded="md" class="mb-4 font-weight-semibold text-14">
                    {{ chip }}
                </v-chip>
                <h3 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">{{ title }}</h3>
                <p class="text-16 text-medium-emphasis lh-lg mb-0 mx-auto su-domain-center__lead">{{ lead }}</p>
                <v-btn v-if="ctaLabel && ctaTo" color="primary" variant="flat" rounded="md" size="large" class="mt-6" :to="ctaTo">
                    {{ ctaLabel }}
                </v-btn>
            </div>

            <div class="su-domain-center__body">
                <div class="su-domain-center__content">
                    <v-row class="su-domain-cards">
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
                    </v-row>

                    <AppAlert v-if="alert" type="info" class="mt-4">
                        {{ alert }}
                    </AppAlert>
                </div>

                <div class="su-domain-center__image">
                    <img :src="image" :alt="imageAlt" :class="['w-100 rounded-xl', imageClass ?? 'su-domain-layout-img']" loading="lazy" />
                </div>
            </div>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/spendup-shared';
</style>
