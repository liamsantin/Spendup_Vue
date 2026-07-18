<script setup lang="ts">
import { computed } from 'vue';
import { FooterMenu1, FooterMenu2, FooterMenu3 } from '@/data/front-pages/front-pages-data';
import { isPricingPageEnabled } from '@/utils/pricing-page-enabled';

const footerMenu2 = computed(() => FooterMenu2.filter((item) => item.link !== '/tarifs' || isPricingPageEnabled()));
</script>

<template>
    <div class="space-p-96">
        <v-container class="max-width-1218">
            <v-row>
                <v-col cols="12" lg="4" sm="6">
                    <h5 class="text-17 textPrimary mb-sm-7 mb-6">Parcourir</h5>
                    <div class="d-flex flex-column ga-4">
                        <div v-for="item in FooterMenu1" :key="item.menu">
                            <v-btn variant="text" :to="item.link" exact class="text-hover-primary link-btn opacity-80">
                                {{ item.menu }}
                            </v-btn>
                        </div>
                    </div>
                </v-col>
                <v-col cols="12" lg="4" sm="6">
                    <h5 class="text-17 textPrimary mb-sm-7 mb-6">Liens</h5>
                    <div class="d-flex flex-column ga-4">
                        <div v-for="item in footerMenu2" :key="item.menu">
                            <v-btn variant="text" :to="item.link" exact class="text-hover-primary link-btn opacity-80">
                                {{ item.menu }}
                            </v-btn>
                        </div>
                    </div>
                </v-col>
                <v-col cols="12" lg="4" sm="6">
                    <h5 class="text-17 textPrimary mb-sm-7 mb-6">Ressources</h5>
                    <div class="d-flex flex-column ga-4">
                        <div v-for="item in FooterMenu3" :key="item.menu">
                            <v-btn variant="text" :to="item.link" exact class="text-hover-primary link-btn opacity-80">
                                {{ item.menu }}
                            </v-btn>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </div>
    <v-container class="max-width-1218 px-md-0 px-3 py-0">
        <div class="py-sm-10 py-6 border-t">
            <div class="d-sm-flex justify-space-between">
                <div class="d-flex ga-2 text-15 opacity-80 justify-sm-start justify-center">
                    <img src="@/assets/images/logos/logoIcon.svg" height="24" class="mx-2" alt="" />
                    Spend.Up — Projet personnel, sans garantie commerciale.
                </div>
                <p class="text-15 opacity-80 d-flex align-center justify-sm-end justify-center pt-sm-0 pt-2">
                    © {{ new Date().getFullYear() }} Tous droits réservés.
                </p>
            </div>
        </div>
    </v-container>
</template>
