<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { DeviceDesktopIcon } from 'vue-tabler-icons';

const FEATURES_IMG = '/assets/images/landingpage/features';

const sectionRef = ref<HTMLElement | null>(null);
const imageOffset = ref(0);
const textOffset = ref(0);
const isVisible = ref(false);

let rafId = 0;

const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const updateParallax = (): void => {
    const section = sectionRef.value;
    if (!section || prefersReducedMotion()) {
        imageOffset.value = 0;
        textOffset.value = 0;
        return;
    }

    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    isVisible.value = rect.bottom > 0 && rect.top < viewportHeight;

    if (!isVisible.value) return;

    const centerDelta = rect.top + rect.height / 2 - viewportHeight / 2;
    imageOffset.value = centerDelta * -0.12;
    textOffset.value = centerDelta * 0.05;
};

const onScroll = (): void => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateParallax);
};

onMounted(() => {
    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
});

onUnmounted(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
});
</script>

<template>
    <section ref="sectionRef" class="py-12 py-md-16 su-accessible-section">
        <v-container class="max-width-1218">
            <v-row align="center">
                <v-col
                    cols="12"
                    md="6"
                    class="pe-md-10 text-center su-accessible-section__text"
                    :class="{ 'su-accessible-section__text--visible': isVisible }"
                    :style="{ transform: `translate3d(0, ${textOffset}px, 0)` }"
                >
                    <div class="d-flex justify-center mb-5">
                        <div class="su-icon-wrap su-icon-wrap--lg rounded-xl d-inline-flex">
                            <DeviceDesktopIcon size="32" class="text-primary" stroke-width="1.5" />
                        </div>
                    </div>

                    <h2 class="text-h4 text-md-h3 font-weight-bold textPrimary mb-4">Une plateforme accessible partout</h2>

                    <p class="text-18 text-medium-emphasis lh-lg mb-4 mx-auto su-narrow">
                        Accédez à vos informations quand vous en avez besoin. Spend.Up est conçu pour fonctionner sur ordinateur, tablette
                        et smartphone afin de vous permettre de consulter et gérer vos finances où que vous soyez.
                    </p>

                    <p class="text-16 text-medium-emphasis lh-lg mb-0 mx-auto su-narrow">
                        Votre espace personnel reste disponible à tout moment depuis un simple navigateur web.
                    </p>
                </v-col>

                <v-col cols="12" md="6" class="mt-8 mt-md-0">
                    <div class="su-parallax-media rounded-xl">
                        <img
                            :src="`${FEATURES_IMG}/platform-accessible-everywhere.png`"
                            alt="Spend.Up accessible sur ordinateur, tablette et smartphone"
                            class="w-100 su-platform-accessible-img su-parallax-media__img"
                            :style="{ transform: `translate3d(0, ${imageOffset}px, 0)` }"
                            loading="lazy"
                        />
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/spendup-shared';
</style>
