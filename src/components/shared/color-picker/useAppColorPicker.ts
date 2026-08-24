import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Borne une valeur numérique dans `[min, max]`. */
function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Convertit HSV → hex `#RRGGBB`.
 * @param h Teinte 0–360.
 * @param s Saturation 0–1.
 * @param v Valeur 0–1.
 */
function hsvToHex(h: number, s: number, v: number) {
    const f = (n: number) => {
        const k = (n + h / 60) % 6;
        const channel = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        return Math.round(channel * 255)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(5)}${f(3)}${f(1)}`.toUpperCase();
}

/**
 * Convertit hex → HSV.
 * @param hex Couleur `#RGB` ou `#RRGGBB`.
 */
function hexToHsv(hex: string) {
    const raw = hex.replace('#', '');
    const full =
        raw.length === 3
            ? raw
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : raw;
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === r) h = 60 * (((g - b) / delta) % 6);
        else if (max === g) h = 60 * ((b - r) / delta + 2);
        else h = 60 * ((r - g) / delta + 4);
    }

    return { h: (h + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

/**
 * Logique du color picker partagé (HSV, drag, input hex, presets).
 * @param options `modelValue`, `disabled`, `emit`.
 * @returns État et handlers du picker.
 */
export function useAppColorPicker(options: {
    modelValue: MaybeRefOrGetter<string | null | undefined>;
    disabled: MaybeRefOrGetter<boolean>;
    emit: (value: string | null) => void;
}) {
    const hue = ref(240);
    const saturation = ref(0.8);
    const value = ref(0.9);
    const isOpen = ref(false);
    const hexInput = ref('');
    const areaEl = ref<HTMLElement | null>(null);
    const hueEl = ref<HTMLElement | null>(null);
    const dragging = ref<'area' | 'hue' | null>(null);

    const currentHex = computed(() => hsvToHex(hue.value, saturation.value, value.value));
    const hueHex = computed(() => hsvToHex(hue.value, 1, 1));
    const previewColor = computed(() => toValue(options.modelValue) ?? null);

    /** Un texte sombre reste lisible sur les couleurs claires (luminance perçue). */
    const isLightColor = computed(() => {
        const { s, v } = hexToHsv(currentHex.value);
        return v > 0.7 && s < 0.6;
    });

    watch(
        () => toValue(options.modelValue),
        (next) => {
            if (!next || !HEX_RE.test(next)) {
                hexInput.value = '';
                return;
            }
            if (next.toUpperCase() === currentHex.value) {
                hexInput.value = currentHex.value.slice(1);
                return;
            }
            const hsv = hexToHsv(next);
            hue.value = hsv.h;
            saturation.value = hsv.s;
            value.value = hsv.v;
            hexInput.value = next.replace('#', '').toUpperCase();
        },
        { immediate: true }
    );

    /** Émet la couleur HSV courante en hex. */
    function commit() {
        hexInput.value = currentHex.value.slice(1);
        options.emit(currentHex.value);
    }

    /** Ouvre le picker si non désactivé. */
    function openPicker() {
        if (!toValue(options.disabled)) isOpen.value = true;
    }

    /**
     * Met à jour saturation / valeur depuis un pointeur sur l’aire.
     * @param event Événement pointeur.
     */
    function updateArea(event: PointerEvent) {
        const rect = areaEl.value?.getBoundingClientRect();
        if (!rect) return;
        saturation.value = clamp((event.clientX - rect.left) / rect.width);
        value.value = 1 - clamp((event.clientY - rect.top) / rect.height);
        commit();
    }

    /**
     * Met à jour la teinte depuis le slider.
     * @param event Événement pointeur.
     */
    function updateHue(event: PointerEvent) {
        const rect = hueEl.value?.getBoundingClientRect();
        if (!rect) return;
        hue.value = clamp((event.clientX - rect.left) / rect.width) * 360;
        commit();
    }

    /**
     * Démarre un drag sur l’aire ou le slider teinte.
     * @param target Zone ciblée.
     * @param event Événement pointeur.
     */
    function startDrag(target: 'area' | 'hue', event: PointerEvent) {
        dragging.value = target;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        if (target === 'area') updateArea(event);
        else updateHue(event);
    }

    /** Suit le drag en cours. */
    function onDragMove(event: PointerEvent) {
        if (dragging.value === 'area') updateArea(event);
        else if (dragging.value === 'hue') updateHue(event);
    }

    /** Termine le drag et libère la capture. */
    function endDrag(event: PointerEvent) {
        dragging.value = null;
        (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    }

    /**
     * Décale la teinte au clavier / boutons.
     * @param delta Décalage en degrés.
     */
    function nudgeHue(delta: number) {
        hue.value = (hue.value + delta + 360) % 360;
        commit();
    }

    /**
     * Parse l’input hex et met à jour HSV / modèle.
     * @param raw Texte saisi.
     */
    function onHexInput(raw: string) {
        hexInput.value = String(raw ?? '')
            .replace(/[^0-9a-f]/gi, '')
            .slice(0, 6);

        if (!hexInput.value) {
            options.emit(null);
            return;
        }

        if (!HEX_RE.test(hexInput.value)) return;

        const hsv = hexToHsv(hexInput.value);
        hue.value = hsv.h;
        saturation.value = hsv.s;
        value.value = hsv.v;
        options.emit(currentHex.value);
    }

    /** Sur blur : réaligne l’input sur le modèle. */
    function onHexBlur() {
        const model = toValue(options.modelValue);
        hexInput.value = model ? model.replace('#', '').toUpperCase() : '';
    }

    /**
     * Applique une couleur preset.
     * @param color Hex preset.
     */
    function selectPreset(color: string) {
        const hsv = hexToHsv(color);
        hue.value = hsv.h;
        saturation.value = hsv.s;
        value.value = hsv.v;
        commit();
    }

    /** Efface la couleur (émet `null`). */
    function clearColor() {
        hexInput.value = '';
        options.emit(null);
    }

    /** Ferme le picker sur Escape. */
    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') isOpen.value = false;
    }

    watch(isOpen, (open) => {
        if (open) document.addEventListener('keydown', onKeydown);
        else document.removeEventListener('keydown', onKeydown);
        document.body.style.overflow = open ? 'hidden' : '';
    });

    onBeforeUnmount(() => {
        document.removeEventListener('keydown', onKeydown);
        document.body.style.overflow = '';
    });

    return {
        hue,
        saturation,
        value,
        isOpen,
        hexInput,
        areaEl,
        hueEl,
        currentHex,
        hueHex,
        previewColor,
        isLightColor,
        openPicker,
        startDrag,
        onDragMove,
        endDrag,
        nudgeHue,
        onHexInput,
        onHexBlur,
        selectPreset,
        clearColor
    };
}
