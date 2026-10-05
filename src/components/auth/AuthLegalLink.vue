<script setup lang="ts">
/**
 * Lien vers une page légale depuis les écrans d'authentification.
 * - Web : nouvel onglet, pour ne pas perdre la saisie du formulaire.
 * - Application Windows (Tauri) : les pages publiques ne sont pas embarquées ; on ouvre le
 *   site public dans le navigateur (`VITE_PUBLIC_SITE_URL`). Sans URL configurée, texte simple.
 */
import { openUrl } from '@tauri-apps/plugin-opener';
import { isTauri } from '@/utils/helpers/platform-helpers';

const props = defineProps<{ to: string }>();

const desktop = isTauri();
const siteUrl = String(import.meta.env.VITE_PUBLIC_SITE_URL ?? '')
    .trim()
    .replace(/\/$/, '');

async function openOnDesktop() {
    try {
        await openUrl(`${siteUrl}${props.to}`);
    } catch {
        // navigateur indisponible : le libellé reste lisible, rien à faire de plus
    }
}
</script>

<template>
    <a v-if="!desktop" class="auth-legal-link" :href="to" target="_blank" rel="noopener"><slot /></a>
    <button v-else-if="siteUrl" type="button" class="auth-legal-link" @click.stop.prevent="openOnDesktop"><slot /></button>
    <span v-else><slot /></span>
</template>

<style scoped>
.auth-legal-link {
    padding: 0;
    border: 0;
    color: rgb(var(--v-theme-primary));
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: rgba(var(--v-theme-primary), 0.35);
    text-underline-offset: 3px;
    background: none;
    cursor: pointer;
}

.auth-legal-link:hover {
    text-decoration-color: currentColor;
}
</style>
