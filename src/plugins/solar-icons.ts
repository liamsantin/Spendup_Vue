import { SolarIconsPlugin, type SolarIconsConfig } from '@solar-icons/vue/lib';

/** Defaults Solar Icons — héritent de la couleur du texte parent. */
export const solarIconsDefaults: SolarIconsConfig = {
    color: 'currentColor',
    size: 24,
    strokeWidth: 1.5,
    secondaryColor: 'currentColor',
    secondaryOpacity: 0.2
};

export { SolarIconsPlugin };
