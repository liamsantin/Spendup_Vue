<script setup lang="ts">
/**
 * Scène d'une maquette produit marketing : halo, trame légère et mise à l'échelle.
 *
 * Tout le contenu est dimensionné en `em` et la taille de police suit la largeur de la
 * scène (`container-type: inline-size`) : une maquette garde ses proportions exactes du
 * desktop au mobile, comme une image vectorielle, sans media query.
 */
withDefaults(
    defineProps<{
        /** Rapport largeur / hauteur de la scène. */
        ratio?: string;
        /** Décor de fond : halo coloré (défaut) ou aucun (tuiles compactes). */
        decor?: 'aura' | 'none';
        /** Libellé accessible décrivant la maquette. */
        label: string;
    }>(),
    { ratio: '4 / 3', decor: 'aura' }
);
</script>

<template>
    <figure class="mk-stage" :class="`mk-stage--${decor}`" :style="{ aspectRatio: ratio }" role="img" :aria-label="label">
        <div class="mk-stage__scene" aria-hidden="true">
            <slot />
        </div>
    </figure>
</template>

<style lang="scss">
@use './mockups';
</style>
