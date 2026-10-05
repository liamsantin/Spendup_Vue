<script setup lang="ts">
import { computed } from 'vue';
import { SpendupPricingPackages } from '@/data/front-pages/front-pages-data';
import type { PackageType } from '@/types/components/front-pages';
import { CircleCheckIcon, CircleXIcon } from 'vue-tabler-icons';

const props = withDefaults(
    defineProps<{
        items?: PackageType[];
        currency?: string;
        showHeader?: boolean;
        headerTitle?: string;
        columnsLg?: number;
        columnsMd?: number;
    }>(),
    {
        items: undefined,
        currency: 'CHF',
        showHeader: true,
        headerTitle: '111,476+ Trusted developers & many tech giants as well',
        columnsLg: 3,
        columnsMd: 6
    }
);

const cards = computed(() => props.items ?? SpendupPricingPackages);

function formatPrice(value: number): string {
    return value.toFixed(2);
}

function isInternalLink(url: string): boolean {
    return url.startsWith('/');
}
</script>

<template>
    <v-container class="max-width-1218 package" id="pricing">
        <v-row v-if="showHeader" class="d-flex justify-center text-center pb-12">
            <v-col cols="12" md="7">
                <h2 class="display-2 font-weight-bold textPrimary">{{ headerTitle }}</h2>
            </v-col>
        </v-row>
        <v-row class="d-flex justify-center">
            <v-col v-for="card in cards" :key="card.caption" cols="12" :lg="columnsLg" :md="columnsMd">
                <v-card elevation="0" class="rounded-16 pa-sm-7 pa-6 border h-100 d-flex flex-column">
                    <div>
                        <div class="d-flex ga-2 align-center flex-wrap">
                            <h4 class="text-20 textPrimary mb-4">{{ card.caption }}</h4>
                            <v-chip v-if="card.tagtext" size="small" class="mt-sm-n4 font-weight-bold" rounded="md" color="primary">
                                {{ card.tagLabel ?? 'Popular' }}
                            </v-chip>
                        </div>

                        <p class="text-13 opacity-80 font-weight-medium">{{ card.subtext }}</p>
                    </div>

                    <v-divider class="my-8" />

                    <div class="d-flex align-center mt-4">
                        <h2 class="display-2 font-weight-bold textPrimary mb-0">{{ currency }}&nbsp;{{ formatPrice(card.price) }}</h2>
                        <span class="text-medium-emphasis font-weight-medium mt-4 ms-2 text-14">/{{ card.period }}</span>
                    </div>
                    <v-list class="mb-0 pl-0 bg-transparent pt-5 flex-grow-1">
                        <v-list-item v-for="desc in card.list" :key="desc.listtitle" class="pa-0">
                            <v-list-item-title
                                v-if="desc.status"
                                :class="{ 'opacity-50': desc.disable }"
                                class="text-body-1 d-flex align-center font-weight-medium"
                            >
                                <CircleXIcon v-if="desc.icon" stroke-width="1.5" size="20" class="mr-2" />
                                <span>{{ desc.listtitle }}</span>
                            </v-list-item-title>
                            <v-list-item-title
                                v-else
                                :class="{ 'opacity-50': desc.disable }"
                                class="text-body-1 d-flex align-center font-weight-medium"
                            >
                                <CircleCheckIcon v-if="desc.icon" stroke-width="1.5" size="20" class="mr-2 text-secondary" />
                                <span>{{ desc.listtitle }}</span>
                            </v-list-item-title>
                        </v-list-item>
                    </v-list>
                    <v-btn
                        color="primary"
                        size="large"
                        class="mt-6 font-weight-medium text-none"
                        :variant="card.buttonOutlined ? 'outlined' : 'flat'"
                        :flat="!card.buttonOutlined"
                        :to="isInternalLink(card.url) ? card.url : undefined"
                        :href="isInternalLink(card.url) ? undefined : card.url"
                        :target="isInternalLink(card.url) ? undefined : '_blank'"
                        :rel="isInternalLink(card.url) ? undefined : 'noopener noreferrer'"
                        block
                    >
                        {{ card.buttontext }}
                    </v-btn>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>
