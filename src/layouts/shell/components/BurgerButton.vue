<script setup lang="ts">
/**
 * Bouton de bascule du menu, en trois barres animées plutôt qu'une icône figée :
 * fermé, un burger dont la barre du bas est plus courte ; ouvert, une croix. Le
 * fond reste transparent dans les deux états, seule la forme parle. Le clic est
 * écouté par le parent (racine unique).
 *
 * Taille : `--burger-size`, qui retombe sur `--slot` pour rester aligné sur la
 * grille des icônes de la colonne.
 */
withDefaults(defineProps<{ open?: boolean; label?: string }>(), {
    label: 'Basculer le menu'
});
</script>

<template>
    <button class="burger" :class="{ 'is-open': open }" type="button" :aria-expanded="!!open" :aria-label="label">
        <span class="burger__box">
            <span class="burger__bar burger__bar--top" />
            <span class="burger__bar burger__bar--mid" />
            <span class="burger__bar burger__bar--bot" />
        </span>
    </button>
</template>

<style scoped>
.burger {
    appearance: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    flex: none;
    display: grid;
    place-items: center;
    width: var(--burger-size, var(--slot));
    height: var(--burger-size, var(--slot));
    border-radius: 50%;
    background: transparent;
    color: var(--ink);
    transition:
        background 0.4s var(--ease),
        transform 0.45s var(--spring),
        color 0.3s var(--ease);
}
.burger:hover {
    background: var(--surface-hover);
    transform: scale(1.08);
}
.burger:active {
    transform: scale(0.94);
}

.burger__box {
    position: relative;
    width: 18px;
    height: 14px;
}
.burger__bar {
    position: absolute;
    left: 0;
    height: 1.8px;
    border-radius: 2px;
    background: currentColor;
    transition:
        transform 0.5s var(--spring),
        width 0.45s var(--ease),
        opacity 0.22s var(--ease);
}
.burger__bar--top {
    top: 0;
    width: 18px;
}
.burger__bar--mid {
    top: 6.1px;
    width: 18px;
}
/* barre du bas plus courte : le burger respire un peu */
.burger__bar--bot {
    bottom: 0;
    width: 13px;
}
/* au survol, elle rattrape les autres */
.burger:not(.is-open):hover .burger__bar--bot {
    width: 18px;
}

/* la barre du milieu s'efface d'abord, les deux autres pivotent ensuite */
.burger.is-open .burger__bar--mid {
    transform: scaleX(0);
    opacity: 0;
    transition-duration: 0.18s;
}
.burger.is-open .burger__bar--top {
    transform: translateY(6.1px) rotate(45deg);
    transition-delay: 0.08s;
}
.burger.is-open .burger__bar--bot {
    width: 18px;
    transform: translateY(-6.1px) rotate(-45deg);
    transition-delay: 0.08s;
}
</style>
