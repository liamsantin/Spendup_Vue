/**
 * Options Perfect Scrollbar partagées — pas de scroll horizontal.
 *
 * `scrollYMarginOffset` : Perfect Scrollbar compare une hauteur de conteneur arrondie à l’entier
 * inférieur au `scrollHeight` arrondi au supérieur. Sans marge, un contenu aux dimensions
 * fractionnaires (courant avec les gutters Vuetify) active le rail pour 1 px fantôme.
 */
export const PERFECT_SCROLLBAR_OPTIONS = {
    suppressScrollX: true,
    scrollYMarginOffset: 2
} as const;
