import type { Component } from 'vue';

/** Un sens de tri, affiché comme segment dans `AppSortChoices`. */
export interface AppSortOption<V extends string = string> {
    value: V;
    /** Libellé court du sens, affiché dans le segment. */
    label: string;
    /** Libellé complet pour les lecteurs d'écran (ex. « Nom (A → Z) »). */
    ariaLabel?: string;
}

/** Un critère de tri (une ligne) et ses sens possibles. */
export interface AppSortGroup<V extends string = string> {
    id: string;
    label: string;
    icon?: Component;
    options: AppSortOption<V>[];
}
