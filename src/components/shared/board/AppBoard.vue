<script setup lang="ts">
/**
 * Plateau de liste : barre de filtres + encoche d’actions à droite, panneau blanc dessous.
 * `#filters` : pastilles de filtre (gauche de la barre).
 * `#filters-pinned` : pastilles placées avant `#filters`, jamais repliées (voir ci-dessous).
 * `#bar` : recherche / compteur (suite de la barre).
 * `#actions` : boutons de l’encoche (libellés dans `.app-board__label`, masqués sur mobile).
 *
 * `mobileFilters="sheet"` : sur téléphone, les pastilles sont repliées derrière un seul
 * bouton « Filtres » qui ouvre un panneau bas où elles s’empilent en pleine largeur.
 * À réserver aux pages dont les pastilles ne tiennent pas sur une ligne ;
 * `activeFilters` alimente alors la pastille de compte du bouton ; les filtres de
 * `#filters-pinned` restent visibles à sa gauche et ne sont pas comptés.
 */
defineOptions({ name: 'AppBoard' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon } from 'vue-tabler-icons';
import { useIsMobile } from '@/layouts/shell/composables/useBreakpoint';

const props = withDefaults(
    defineProps<{
        mobileFilters?: 'inline' | 'sheet';
        activeFilters?: number;
    }>(),
    { mobileFilters: 'inline', activeFilters: 0 }
);

const { t } = useI18n();
const isMobile = useIsMobile();
const filtersCollapsed = computed(() => props.mobileFilters === 'sheet' && isMobile.value);
const sheetOpen = ref(false);
</script>

<template>
    <section class="app-board" :class="{ 'app-board--notched': $slots.actions }">
        <div class="app-board__top">
            <div class="app-board__bar">
                <div v-if="$slots.filters || $slots['filters-pinned']" class="app-board__filters">
                    <slot name="filters-pinned" />
                    <button
                        v-if="filtersCollapsed && $slots.filters"
                        type="button"
                        class="su-btn"
                        aria-haspopup="dialog"
                        :aria-expanded="sheetOpen"
                        @click="sheetOpen = true"
                    >
                        <AdjustmentsHorizontalIcon :size="16" stroke-width="1.6" />
                        {{ t('common.filters') }}
                        <span v-if="activeFilters > 0" class="su-btn__count">{{ activeFilters }}</span>
                    </button>
                    <slot v-else name="filters" />
                </div>
                <slot name="bar" />
            </div>
            <div v-if="$slots.actions" class="app-board__notch">
                <slot name="actions" />
            </div>
        </div>
        <div class="app-board__panel">
            <slot />
        </div>
    </section>

    <v-bottom-sheet v-if="filtersCollapsed" v-model="sheetOpen" :aria-label="t('common.filters')">
        <div class="app-board-sheet">
            <span class="app-board-sheet__handle" aria-hidden="true" />
            <header class="app-board-sheet__head">
                <p class="app-board-sheet__title">{{ t('common.filters') }}</p>
                <button type="button" class="su-btn app-board-sheet__done" @click="sheetOpen = false">
                    {{ t('common.done') }}
                </button>
            </header>
            <div class="app-board-sheet__list">
                <slot name="filters" />
            </div>
        </div>
    </v-bottom-sheet>
</template>

<!-- Non scopé : s’applique aux composants passés en slot (filtres, recherche, boutons). -->
<style>
/* Plateau Swiss : une ligne filtres · recherche soulignée · actions, puis la liste à plat. */
.su-body:has(> .app-board) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    padding-top: 24px;
}

.app-board {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.app-board__top {
    flex: none;
    display: flex;
    align-items: flex-end;
    gap: 24px;
    min-width: 0;
    padding-bottom: 16px;
}

.app-board__bar {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 22px;
}

.app-board__filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 22px;
}

/* déclencheurs de filtre : texte seul, actif = 700 souligné ; compteur en pastille bleue */
.app-board .app-board__filters .su-btn {
    height: 40px;
    min-height: 40px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font-size: 14px;
    font-weight: 400;
    box-shadow: none;
}

.app-board .app-board__filters .su-btn:hover:not(:disabled) {
    background: transparent;
    color: var(--ink);
}

.app-board .app-board__filters .su-btn.is-active,
.app-board .app-board__filters .su-btn[aria-expanded='true'] {
    color: var(--ink);
    font-weight: 700;
    box-shadow: inset 0 -2px 0 var(--ink);
}

.app-board .app-board__filters .su-btn > svg {
    display: none;
}

.app-board__notch {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
}

.app-board .app-board__notch .su-btn--ink {
    height: 40px;
    padding: 0 16px;
    gap: 8px;
    border: 1px solid var(--ink);
    background: transparent;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink);
    box-shadow: none;
}

.app-board .app-board__notch .su-btn--ink:hover:not(:disabled) {
    background: var(--soft);
}

.app-board .app-board__notch .su-btn--ink.app-board__primary {
    background: var(--blue-btn);
    border-color: var(--blue-btn);
    color: #fff;
    box-shadow: none;
}

.app-board .app-board__notch .su-btn--ink.app-board__primary:hover:not(:disabled) {
    background: var(--blue-ink);
    border-color: var(--blue-ink);
}

.app-board__panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
}

@media (max-width: 767px) {
    .su-body:has(> .app-board) {
        padding-top: 16px;
    }

    .app-board__top {
        gap: 8px;
        padding-bottom: 12px;
    }

    .app-board__bar {
        flex-wrap: nowrap;
        gap: 12px;
    }

    .app-board__filters {
        flex-wrap: nowrap;
        gap: 16px;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .app-board__filters::-webkit-scrollbar {
        display: none;
    }

    .app-board__filters > * {
        flex: none;
    }

    .app-board__notch {
        gap: 6px;
    }

    .app-board__label,
    .app-board__count {
        display: none !important;
    }

    .app-board .app-board__notch .su-btn--ink {
        width: 40px;
        height: 40px;
        padding: 0;
    }
}

/* ── panneau bas des filtres repliés (mobile) ─────────── */
.app-board-sheet {
    max-height: 80dvh;
    overflow-y: auto;
    padding: 12px 16px calc(20px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--ink);
    background: var(--raise);
    color: var(--ink);
    font-family: var(--font-ui);
}

.app-board-sheet__handle {
    display: none;
}

.app-board-sheet__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 12px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 8px;
}

.app-board-sheet__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.app-board-sheet .app-board-sheet__done {
    height: 36px;
    min-height: 36px;
    padding: 0 14px;
    font-size: 13px;
}

.app-board-sheet__list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.app-board-sheet__list > *,
.app-board-sheet__list > * > button {
    width: 100%;
}

/* spécificité relevée : passe devant les styles scopés des déclencheurs de page */
.app-board-sheet .app-board-sheet__list button,
.app-board-sheet .app-board-sheet__list > label {
    justify-content: flex-start;
    min-height: 48px;
    padding: 0 4px;
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    font-size: 15px;
    color: var(--ink);
}

.app-board-sheet__list .su-btn__count {
    margin-left: auto;
}
</style>
