<script setup lang="ts">
defineOptions({ name: 'AppLogo' });

import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { APP_HOME_ROUTE } from '@/features/auth';
import { useAppHomeTarget } from '@/utils/helpers/navigation-helpers';

/**
 * Logo Spend.Up : pictogramme (cartes empilées) + mot-symbole « Spend.Up » dont le point est bleu.
 * Le mot-symbole est en texte pour hériter de la couleur d'encre (clair / sombre) sans variante d'image.
 */
const props = withDefaults(
    defineProps<{
        homeTo?: string;
        /** Pictogramme seul (rail replié, favicon-like). */
        iconOnly?: boolean;
        /** Taille du pictogramme en px. */
        size?: number;
    }>(),
    { homeTo: undefined, iconOnly: false, size: 28 }
);

const route = useRoute();
const publicHome = useAppHomeTarget(props.homeTo);

/** Sous /app → dashboard ; ailleurs → home plateforme (login en Tauri, landings en web). */
const logoTo = computed(() => (route.path.startsWith('/app') ? APP_HOME_ROUTE : publicHome.value));
</script>

<template>
    <div class="logo">
        <RouterLink :to="logoTo" class="spendup-logo" :class="{ 'spendup-logo--icon': iconOnly }" aria-label="Spend.Up">
            <svg
                class="spendup-logo__icon"
                :width="size"
                :height="size"
                viewBox="140 196 720 560"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
            >
                <g transform="rotate(-21 300 650)"><rect x="260" y="310" width="420" height="280" class="spendup-logo__card-back" /></g>
                <g transform="rotate(-14 300 650)"><rect x="272" y="324" width="420" height="280" class="spendup-logo__card-back" /></g>
                <g transform="rotate(-7 300 650)"><rect x="284" y="338" width="420" height="280" class="spendup-logo__card-mid" /></g>
                <rect x="300" y="370" width="420" height="290" fill="#5D87FF" />
                <rect x="350.4" y="422.2" width="79.8" height="63.8" class="spendup-logo__card-detail" />
                <rect x="350.4" y="573" width="168" height="26.1" class="spendup-logo__card-detail" />
            </svg>
            <span v-if="!iconOnly" class="spendup-logo__text">Spend<span class="spendup-logo__dot">.</span>Up</span>
        </RouterLink>
    </div>
</template>

<style scoped lang="scss">
.spendup-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--ink, #0b0c10);
    text-decoration: none;
}

.spendup-logo__icon {
    display: block;
    flex: none;
    overflow: visible;
}

.spendup-logo__card-back {
    fill: #e1e3e8;
}

.spendup-logo__card-mid {
    fill: #0b0c10;
}

.spendup-logo__card-detail {
    fill: #ffffff;
}

[class*='v-theme--DARK_'] .spendup-logo__card-back {
    fill: #3a3d47;
}

[class*='v-theme--DARK_'] .spendup-logo__card-mid {
    fill: #ffffff;
}

[class*='v-theme--DARK_'] .spendup-logo__card-detail {
    fill: #0b0c10;
}

.spendup-logo__text {
    font-family: var(--font-ui, 'Helvetica Neue', Helvetica, Arial, sans-serif);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1;
    white-space: nowrap;
    color: inherit;
}

.spendup-logo__dot {
    color: #5d87ff;
}
</style>
