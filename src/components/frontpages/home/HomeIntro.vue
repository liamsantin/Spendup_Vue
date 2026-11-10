<script setup lang="ts">
/**
 * Intro plein écran de la home publique : l'icône s'ouvre en éventail, « Spend.Up » se déroule,
 * le sous-titre s'écrit mot par mot (centré, réduit), puis le logo rejoint celui du header et le
 * sous-titre grandit et se pose exactement sur le h1 du hero.
 * Garde-fous : une fois par session, défilement bloqué pendant l'intro, ignorée si prefers-reduced-motion.
 *
 * Anti-décalage : on ne touche jamais à l'overflow de la page (la barre de défilement disparaîtrait
 * puis reviendrait, ce qui ferait sauter la mise en page). Le sous-titre reprend la typo et la
 * largeur exactes du h1 : ses retours à la ligne sont identiques.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const STORAGE_KEY = 'su-home-intro-seen';
const HTML_CLASS = 'su-intro-active';
const HERO_TITLE = '.su-home h1, .front-wraper h1';
const HEADER_LOGO = '.front-header .spendup-logo';
const FLY_AT = 4100;
const FLY_MS = 1100;
/** Agrandissement max du logo de l'intro par rapport à celui du header. */
const LOGO_MAX_SCALE = 7;
/** Taille du sous-titre pendant l'intro, relative au h1 qu'il va rejoindre. */
const TITLE_SCALE = 0.6;
const EASE = 'cubic-bezier(.65, 0, .25, 1)';

/** Titre découpé en mots : centré pendant l'intro, chaque mot glisse ensuite vers l'alignement gauche du h1. */
const WORDS = [
    ...['La', 'plateforme', 'de', 'gestion financière'].map((text) => ({ text, accent: false })),
    // un seul bloc : isolé, « 100 % » n'est pas espacé comme dans le h1 (décalage de ~10 px)
    { text: '100 % suisse.', accent: true }
];

const visible = ref(false);
const leaving = ref(false);
const overlay = ref<HTMLElement | null>(null);
const logo = ref<HTMLElement | null>(null);
const mark = ref<HTMLElement | null>(null);
const title = ref<HTMLElement | null>(null);
const logoScale = ref(LOGO_MAX_SCALE);
const markWidth = ref(0);
const titleStyle = ref<Record<string, string>>({});
const titleWrapStyle = ref<Record<string, string>>({});

const timers: number[] = [];
let finished = false;

function alreadySeen(): boolean {
    try {
        return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function markSeen() {
    try {
        sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
        /* stockage indisponible : on rejouera simplement l'intro */
    }
}

function heroTitle(): HTMLElement | null {
    return document.querySelector<HTMLElement>(HERO_TITLE);
}

/**
 * Le logo de l'intro est le logo du header (icône + « Spend.Up ») dessiné en plus grand :
 * mêmes proportions, donc l'envol n'est qu'une translation + réduction uniforme.
 */
async function syncLogoWithHeader() {
    const w = document.querySelector(HEADER_LOGO)?.getBoundingClientRect().width || 133;
    logoScale.value = Math.min(LOGO_MAX_SCALE, (window.innerWidth * 0.85) / w);
    await nextTick();
    if (mark.value) markWidth.value = mark.value.scrollWidth;
}

/** Copie la typo et la largeur du h1 pour que le texte se coupe aux mêmes endroits. */
function syncTitleWithHero() {
    const h1 = heroTitle();
    if (!h1) return;
    h1.style.animation = 'none'; // pas d'entrée décalée : la cible doit être immobile
    const cs = getComputedStyle(h1);
    const rect = h1.getBoundingClientRect();
    titleStyle.value = {
        width: `${rect.width}px`,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        lineHeight: cs.lineHeight,
        textWrap: cs.getPropertyValue('text-wrap') || 'wrap',
        color: cs.color,
        transform: `scale(${TITLE_SCALE})`
    };
    // Le scale ne réduit pas la boîte : on retire l'espace vide laissé sous le titre
    titleWrapStyle.value = { marginBottom: `${-(1 - TITLE_SCALE) * rect.height}px` };
}

function syncAll() {
    syncTitleWithHero();
    syncLogoWithHeader();
}

function cleanup() {
    timers.forEach((t) => window.clearTimeout(t));
    timers.length = 0;
    window.removeEventListener('keydown', blockScroll);
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
    window.removeEventListener('resize', syncAll);
    document.documentElement.classList.remove(HTML_CLASS);
}

function done() {
    if (finished) return;
    finished = true;
    cleanup();
    visible.value = false;
}

/** L'icône vole vers le header, le titre glisse sur le h1, puis le fond s'efface. */
async function fly() {
    if (finished || leaving.value) return;

    // FLIP des mots : position centrée -> bascule à gauche -> on anime l'écart jusqu'à 0
    const words = Array.from(title.value?.querySelectorAll<HTMLElement>('.su-intro__word') ?? []);
    const centered = words.map((w) => w.getBoundingClientRect().left);
    leaving.value = true;
    await nextTick();
    words.forEach((w, i) => {
        // mesures faites à l'échelle réduite : on revient dans le repère du <p>
        const dx = (centered[i] - w.getBoundingClientRect().left) / TITLE_SCALE;
        if (dx && w.animate) {
            w.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: FLY_MS, easing: EASE });
        }
    });

    // Logo -> logo du header
    const el = logo.value;
    const target = document.querySelector(HEADER_LOGO);
    if (el?.animate && target) {
        const from = el.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        el.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width})` }], {
            duration: FLY_MS,
            easing: EASE,
            fill: 'forwards'
        });
    }

    // Titre : affiché réduit (origine en haut au centre), il grandit jusqu'à la taille du h1
    const p = title.value;
    const h1 = heroTitle();
    if (p?.animate && h1) {
        const r = p.getBoundingClientRect();
        const to = h1.getBoundingClientRect();
        const dx = to.left - (r.left + r.width / 2 - p.offsetWidth / 2);
        const dy = to.top - r.top;
        p.animate([{ transform: `translate(0px, 0px) scale(${TITLE_SCALE})` }, { transform: `translate(${dx}px, ${dy}px) scale(1)` }], {
            duration: FLY_MS,
            easing: EASE,
            fill: 'forwards'
        });
    }

    overlay.value?.animate?.([{ backgroundColor: 'rgba(255,255,255,1)' }, { backgroundColor: 'rgba(255,255,255,0)' }], {
        duration: 700,
        delay: 350,
        easing: 'ease-out',
        fill: 'forwards'
    });
    timers.push(window.setTimeout(done, FLY_MS + 30));
}

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

/** Bloque le défilement pendant l'intro sans toucher à l'overflow (pas de décalage de la page). */
function blockScroll(e: Event) {
    if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return;
    e.preventDefault();
}

onMounted(async () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (alreadySeen() || reduced) return;
    markSeen();

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.documentElement.classList.add(HTML_CLASS);
    syncTitleWithHero();
    visible.value = true;
    await syncLogoWithHeader();

    window.addEventListener('keydown', blockScroll);
    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });
    window.addEventListener('resize', syncAll);

    timers.push(window.setTimeout(fly, FLY_AT));
});

onBeforeUnmount(cleanup);
</script>

<template>
    <Teleport to="body">
        <div v-if="visible" ref="overlay" class="su-intro" role="presentation">
            <div class="su-intro__stage" :style="{ '--s': logoScale, '--mw': `${markWidth}px` }">
                <div ref="logo" class="su-intro__logo">
                    <svg class="su-intro__icon" viewBox="140 196 720 560" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <g class="su-intro__card su-intro__card--1"><rect x="260" y="310" width="420" height="280" fill="#E1E3E8" /></g>
                        <g class="su-intro__card su-intro__card--2"><rect x="272" y="324" width="420" height="280" fill="#E1E3E8" /></g>
                        <g class="su-intro__card su-intro__card--3"><rect x="284" y="338" width="420" height="280" fill="#0B0C10" /></g>
                        <rect x="300" y="370" width="420" height="290" fill="#5D87FF" />
                        <rect class="su-intro__chip" x="350.4" y="422.2" width="79.8" height="63.8" fill="#FFFFFF" />
                        <rect class="su-intro__bar" x="350.4" y="573" width="168" height="26.1" fill="#FFFFFF" />
                    </svg>
                    <span class="su-intro__mark-clip" :class="{ 'su-intro__mark-clip--ready': markWidth > 0 }"
                        ><span ref="mark" class="su-intro__mark">Spend<span class="su-intro__dot">.</span>Up</span></span
                    >
                </div>
                <div class="su-intro__title-wrap" :style="titleWrapStyle">
                    <p ref="title" class="su-intro__title" :class="{ 'su-intro__title--left': leaving }" :style="titleStyle">
                        <template v-for="(w, i) in WORDS" :key="i"
                            ><span class="su-intro__word" :class="{ 'su-intro__accent': w.accent }" :style="{ '--i': i }">{{ w.text }}</span
                            >{{ i < WORDS.length - 1 ? ' ' : '' }}</template
                        >
                    </p>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style lang="scss">
/* Pendant l'intro : on masque les éléments que l'intro va « devenir » (sans toucher au layout). */
html.su-intro-active {
    .front-header .spendup-logo,
    .su-home h1,
    .front-wraper h1 {
        visibility: hidden;
    }
}

.su-intro {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
}

.su-intro__stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    max-width: 100%;
    padding: 0 16px;
}

/* Logo du header (icône 28px + 10px + texte 22px) multiplié par --s */
.su-intro__logo {
    display: flex;
    align-items: center;
}

.su-intro__icon {
    flex: none;
    width: calc(28px * var(--s));
    height: calc(28px * var(--s));
    overflow: visible;
    transform-origin: center;
    animation: su-intro-pop 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.su-intro__card {
    transform-box: view-box;
    transform-origin: 300px 650px;
    animation: su-intro-fan 900ms cubic-bezier(0.2, 0.8, 0.2, 1) 250ms both;
}
.su-intro__card--1 {
    --su-angle: -21deg;
}
.su-intro__card--2 {
    --su-angle: -14deg;
}
.su-intro__card--3 {
    --su-angle: -7deg;
}

.su-intro__chip {
    animation: su-intro-fade 300ms ease-out 800ms both;
}

.su-intro__bar {
    transform-box: fill-box;
    transform-origin: left center;
    animation: su-intro-draw 500ms cubic-bezier(0.2, 0.8, 0.2, 1) 950ms both;
}

/* « Spend.Up » se déroule à droite de l'icône une fois l'éventail ouvert : l'icône glisse à gauche. */
.su-intro__mark-clip {
    display: block;
    overflow: hidden;
    width: 0;
    margin-left: 0;
    // Marge de sécurité autour du texte (jambage et fin du « p »), compensée par des marges
    // négatives : la boîte reste proportionnelle à celle du header, l'envol tombe juste.
    font-size: calc(22px * var(--s));
    padding: 0.1em 0.12em 0.25em 0;
    margin-top: -0.1em;
    margin-right: -0.12em;
    margin-bottom: -0.25em;

    &--ready {
        animation: su-intro-mark 700ms cubic-bezier(0.65, 0, 0.25, 1) 1250ms both;
    }
}

.su-intro__mark {
    display: block;
    font-family: var(--font-ui, 'Helvetica Neue', Helvetica, Arial, sans-serif);
    font-size: calc(22px * var(--s));
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1;
    white-space: nowrap;
    color: var(--ink, #0b0c10);
}

.su-intro__dot {
    color: #5d87ff;
}

.su-intro__title {
    margin: 0;
    transform-origin: top center;
    text-align: center;
    color: #0b0c10;

    &--left {
        text-align: left;
    }
}

.su-intro__word {
    display: inline-block;
    // Écriture mot par mot, après « Spend.Up » (fini vers 3,5 s)
    animation: su-intro-word 650ms cubic-bezier(0.2, 0.8, 0.2, 1) calc(2300ms + var(--i) * 160ms) both;
}

.su-intro__accent {
    color: #5d87ff;
}

@keyframes su-intro-mark {
    from {
        width: 0;
        margin-left: 0;
        opacity: 0;
    }
    // + padding droit : la boîte est en border-box
    to {
        width: calc(var(--mw) + 0.12em);
        margin-left: calc(10px * var(--s));
        opacity: 1;
    }
}
@keyframes su-intro-word {
    from {
        opacity: 0;
        transform: translateY(0.25em);
    }
    to {
        opacity: 1;
        transform: none;
    }
}
@keyframes su-intro-pop {
    from {
        opacity: 0;
        transform: scale(0.85);
    }
    to {
        opacity: 1;
        transform: none;
    }
}
@keyframes su-intro-fan {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(var(--su-angle));
    }
}
@keyframes su-intro-fade {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
@keyframes su-intro-draw {
    from {
        transform: scaleX(0);
    }
    to {
        transform: scaleX(1);
    }
}
</style>
