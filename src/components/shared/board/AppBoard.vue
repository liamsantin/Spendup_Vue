<script setup lang="ts">
/**
 * Plateau de liste : barre de filtres + encoche d’actions à droite, panneau blanc dessous.
 * `#filters` : pastilles de filtre (gauche de la barre).
 * `#bar` : recherche / compteur (suite de la barre).
 * `#actions` : boutons de l’encoche (libellés dans `.app-board__label`, masqués sur mobile).
 */
defineOptions({ name: 'AppBoard' });
</script>

<template>
    <section class="app-board" :class="{ 'app-board--notched': $slots.actions }">
        <div class="app-board__top">
            <div class="app-board__bar">
                <div v-if="$slots.filters" class="app-board__filters">
                    <slot name="filters" />
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
</template>

<!-- Non scopé : s’applique aux composants passés en slot (pastilles, recherche, boutons). -->
<style>
.su-page:has(> .su-body > .app-board) > .su-hero {
    padding: 2px 6px 0;
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
}

.su-body:has(> .app-board) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    padding-top: 8px;
}

.app-board {
    --board-shell: rgba(255, 255, 255, 0.55);
    --board-card: #fffdf9;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.app-board__top {
    flex: none;
    display: flex;
    align-items: stretch;
    min-width: 0;
}

.app-board__bar {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 14px 14px 12px 18px;
    background: var(--board-shell);
    border-radius: 28px 28px 0 0;
}

.app-board--notched .app-board__bar::after {
    content: '';
    position: absolute;
    z-index: 1;
    right: -24px;
    bottom: 0;
    width: 24px;
    height: 24px;
    background: radial-gradient(circle at 100% 0, transparent 23px, var(--board-shell) 24px);
    pointer-events: none;
}

.app-board__filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.app-board .app-board__filters .su-btn {
    height: 34px;
    padding: 0 14px;
    border-radius: 17px;
    background: #fff;
    font-size: 0.8rem;
    box-shadow:
        0 1px 2px rgba(16, 16, 20, 0.06),
        0 0 0 1px rgba(16, 16, 20, 0.05);
}

.app-board__notch {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 2px 16px 22px;
}

.app-board .app-board__notch .su-btn--ink {
    height: 40px;
    padding: 0 16px;
    gap: 8px;
    border-radius: 20px;
    background: #fff;
    font-size: 0.82rem;
    font-weight: 550;
    color: var(--ink);
    box-shadow:
        0 10px 24px -16px rgba(16, 16, 20, 0.45),
        0 0 0 1px rgba(255, 255, 255, 0.9);
}

.app-board .app-board__notch .su-btn--ink:hover:not(:disabled) {
    background: #fff;
}

.app-board .app-board__notch .su-btn--ink.app-board__primary {
    background: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
    box-shadow: 0 10px 24px -14px rgba(var(--v-theme-primary), 0.7);
}

.app-board .app-board__notch .su-btn--ink.app-board__primary:hover:not(:disabled) {
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 88%, #000);
}

.app-board__panel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--board-card);
    border-radius: 0 0 28px 28px;
    box-shadow: 0 18px 44px -30px rgba(16, 16, 20, 0.38);
}

.app-board--notched .app-board__panel {
    border-radius: 0 28px 28px 28px;
}

@media (max-width: 767px) {
    .su-body:has(> .app-board) {
        padding: 0;
    }

    .app-board__bar {
        flex-wrap: nowrap;
        gap: 6px;
        border-radius: 22px 22px 0 0;
        padding: 6px 4px 6px 6px;
    }

    .app-board__filters {
        flex-wrap: nowrap;
        gap: 6px;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
        /* Laisse respirer l’ombre des pastilles malgré le défilement horizontal. */
        padding: 2px;
        margin: -2px;
    }

    .app-board__filters::-webkit-scrollbar {
        display: none;
    }

    .app-board__filters > * {
        flex: none;
    }

    .app-board .app-board__filters .su-btn {
        padding: 0 10px;
    }

    .app-board__notch {
        gap: 6px;
        padding: 2px 0 8px 12px;
    }

    .app-board__label,
    .app-board__count {
        display: none !important;
    }

    .app-board .app-board__notch .su-btn--ink {
        width: 38px;
        height: 38px;
        padding: 0;
    }

    .app-board__panel {
        border-radius: 0 0 22px 22px;
    }

    .app-board--notched .app-board__panel {
        border-radius: 0 22px 22px 22px;
    }
}
</style>
