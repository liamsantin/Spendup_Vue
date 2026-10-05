<script setup lang="ts">
/**
 * Fenêtre de navigateur (Spend.Up est une application web) : navigation, barre d'adresse
 * sécurisée et contrôles de fenêtre façon Windows. Dimensionnée en `em`.
 */
import { computed } from 'vue';
import { MOCK_APP_HOST } from './format';

const props = withDefaults(
    defineProps<{
        /** Libellé de la page, ex. « Spend.Up · Transactions » → `/transactions`. */
        title?: string;
        /** Chemin affiché dans la barre d'adresse (déduit du titre sinon). */
        path?: string;
    }>(),
    { title: 'Spend.Up', path: undefined }
);

/** « Spend.Up · Octobre 2026 » → « /octobre-2026 » */
function slug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

const address = computed(() => {
    if (props.path) return props.path;
    const page = props.title.split('·').slice(1).join(' ').trim();
    return page ? `/${slug(page)}` : '/';
});
</script>

<template>
    <div class="mk-window">
        <div class="mk-window__bar">
            <span class="mk-window__nav" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
                <svg viewBox="0 0 24 24" class="is-off"><path d="M9 6l6 6-6 6" /></svg>
                <svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4" /></svg>
            </span>
            <span class="mk-window__omnibox">
                <svg viewBox="0 0 24 24" class="mk-window__lock" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <span class="mk-window__host">{{ MOCK_APP_HOST }}</span
                ><span class="mk-window__path">{{ address }}</span>
            </span>
            <span class="mk-window__controls" aria-hidden="true">
                <i class="is-min"></i>
                <i class="is-max"></i>
                <i class="is-close"></i>
            </span>
        </div>
        <div class="mk-window__body">
            <slot />
        </div>
    </div>
</template>
