<script setup lang="ts">
/**
 * Intro plein écran de la home publique, même chorégraphie que `public/brand/spendup-logo-anime.svg`
 * (générée par `scripts/build-logo-anime.mjs`) : la carte bleue (porte-monnaie) tombe en premier, les trois
 * autres cartes y tombent et rebondissent, l'éventail s'ouvre, « Spend » monte lettre par lettre, le point
 * bleu tombe, « Up » monte ; le sous-titre s'écrit mot par mot sur une seule ligne, calé à gauche sur le « S »
 * de « Spend », puis le logo rejoint celui du header et chaque mot glisse et grandit jusqu'à sa place dans le h1.
 * Garde-fous : une fois par session, défilement bloqué pendant l'intro, ignorée si prefers-reduced-motion.
 *
 * Anti-décalage : on ne touche jamais à l'overflow de la page (la barre de défilement disparaîtrait
 * puis reviendrait, ce qui ferait sauter la mise en page). Le sous-titre reprend la typo exacte du h1 ;
 * au départ, il reprend aussi sa largeur : ses retours à la ligne sont alors identiques.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import SwissFlag from '@/components/frontpages/shared/SwissFlag.vue';

const STORAGE_KEY = 'su-home-intro-seen';
const HTML_CLASS = 'su-intro-active';
const HERO_TITLE = '.su-home h1, .front-wraper h1';
const HEADER_LOGO = '.front-header .spendup-logo';
const FLY_AT = 4800;
const FLY_MS = 1100;
/** Agrandissement max du logo de l'intro par rapport à celui du header. */
const LOGO_MAX_SCALE = 7;
/** Taille max du sous-titre pendant l'intro, relative au h1 ; réduite si la ligne ne tient pas. */
const TITLE_SCALE = 0.45;
/** Espace entre le logo et le sous-titre, et marge à droite de l'écran. */
const TITLE_GAP = 32;
const SCREEN_GUTTER = 16;
/** Logo du header : icône 28 px, puis 10 px avant « Spend.Up » (multipliés par l'échelle). */
const ICON_PX = 28;
const MARK_GAP_PX = 10;
const EASE = 'cubic-bezier(.65, 0, .25, 1)';

/** « Spend.Up » lettre par lettre : départ de chaque lettre en ms (mêmes instants que le SVG animé). */
const MARK = [
    { ch: 'S', at: 2000 },
    { ch: 'p', at: 2060 },
    { ch: 'e', at: 2120 },
    { ch: 'n', at: 2180 },
    { ch: 'd', at: 2240 },
    { ch: '.', at: 2500, dot: true },
    { ch: 'U', at: 2800 },
    { ch: 'p', at: 2860 }
];

/** Titre découpé en mots : une ligne pendant l'intro, chaque mot glisse ensuite vers sa place dans le h1. */
const WORDS = [
    ...['La', 'future', 'plateforme', 'de', 'gestion financière'].map((text) => ({ text, accent: false })),
    // un seul bloc : isolé, « 100 % » n'est pas espacé comme dans le h1 (décalage de ~10 px)
    { text: '100 % Suisse.', accent: true }
];

const visible = ref(false);
const leaving = ref(false);
const overlay = ref<HTMLElement | null>(null);
const logo = ref<HTMLElement | null>(null);
const mark = ref<HTMLElement | null>(null);
const title = ref<HTMLElement | null>(null);
const logoScale = ref(LOGO_MAX_SCALE);
const markWidth = ref(0);
/** Typo du h1, partagée par l'intro et l'arrivée. */
const titleStyle = ref<Record<string, string>>({});
/** Position du sous-titre : sur une ligne sous le logo, puis exactement sur le h1. */
const titleBox = ref<Record<string, string>>({});
const stageStyle = ref<Record<string, string>>({});
let titleScale = TITLE_SCALE;
let heroTextWrap = 'wrap';

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

/** Copie la typo du h1 pour que les mots aient exactement sa taille une fois posés. */
function syncTitleWithHero() {
    const h1 = heroTitle();
    if (!h1) return;
    h1.style.animation = 'none'; // pas d'entrée décalée : la cible doit être immobile
    const cs = getComputedStyle(h1);
    titleStyle.value = {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        lineHeight: cs.lineHeight,
        color: cs.color
    };
    // Appliqué seulement à l'arrivée : en inline, il annulerait le white-space: nowrap de l'intro
    heroTextWrap = cs.getPropertyValue('text-wrap') || 'wrap';
}

/**
 * Place le sous-titre sur une ligne sous le logo, son bord gauche sur celui de « Spend ».
 * La position est calculée sur le logo final (« Spend.Up » entièrement déroulé) : le texte
 * ne bouge pas pendant que le logo s'ouvre. Le tout reste centré verticalement à l'écran.
 */
async function placeTitle() {
    const p = title.value;
    const el = logo.value;
    if (!p || !el || leaving.value) return;

    const s = logoScale.value;
    const logoWidth = (ICON_PX + MARK_GAP_PX) * s + markWidth.value;
    // Largeur de l’overlay, sans la barre de défilement : c’est elle qui centre le logo
    const width = overlay.value?.clientWidth || window.innerWidth;
    const spendLeft = width / 2 - logoWidth / 2 + (ICON_PX + MARK_GAP_PX) * s;
    const available = width - SCREEN_GUTTER - spendLeft;
    titleScale = Math.min(TITLE_SCALE, available / Math.max(1, p.scrollWidth));
    const lineHeight = p.offsetHeight * titleScale;

    // Réserve la hauteur du titre sous le logo : le groupe logo + titre reste centré
    stageStyle.value = { paddingBottom: `${TITLE_GAP + lineHeight}px` };
    await nextTick();
    const logoRect = el.getBoundingClientRect();
    titleBox.value = {
        left: `${spendLeft}px`,
        top: `${logoRect.bottom + TITLE_GAP}px`,
        transform: `scale(${titleScale})`
    };
}

async function syncAll() {
    syncTitleWithHero();
    await syncLogoWithHeader();
    await placeTitle();
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

/** L'icône vole vers le header, chaque mot glisse à sa place dans le h1, puis le fond s'efface. */
async function fly() {
    if (finished || leaving.value) return;

    // FLIP des mots : une ligne réduite -> le <p> se pose sur le h1 (taille réelle, mêmes retours
    // à la ligne) -> chaque mot part de son ancienne position et de l'ancienne taille.
    const words = Array.from(title.value?.querySelectorAll<HTMLElement>('.su-intro__word') ?? []);
    const before = words.map((w) => w.getBoundingClientRect());
    const h1 = heroTitle()?.getBoundingClientRect();
    leaving.value = true;
    if (h1) {
        titleBox.value = {
            left: `${h1.left}px`,
            top: `${h1.top}px`,
            width: `${h1.width}px`,
            transform: 'none',
            textWrap: heroTextWrap
        };
    }
    await nextTick();
    words.forEach((w, i) => {
        const after = w.getBoundingClientRect();
        const dx = before[i].left - after.left;
        const dy = before[i].top - after.top;
        w.animate?.([{ transform: `translate(${dx}px, ${dy}px) scale(${titleScale})` }, { transform: 'none' }], {
            duration: FLY_MS,
            easing: EASE
        });
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
    await placeTitle();

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
            <div class="su-intro__stage" :style="{ ...stageStyle, '--s': logoScale, '--mw': `${markWidth}px` }">
                <div ref="logo" class="su-intro__logo">
                    <svg class="su-intro__icon" viewBox="140 196 720 560" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <defs>
                            <!-- Les cartes arrivent par le haut : visibles seulement sous cette ligne -->
                            <clipPath id="su-intro-clip"><rect x="140" y="0" width="720" height="756" /></clipPath>
                        </defs>
                        <g clip-path="url(#su-intro-clip)">
                            <g class="su-intro__drop su-intro__drop--1">
                                <g class="su-intro__card su-intro__card--1">
                                    <rect x="260" y="310" width="420" height="280" fill="#E1E3E8" />
                                </g>
                            </g>
                            <g class="su-intro__drop su-intro__drop--2">
                                <g class="su-intro__card su-intro__card--2">
                                    <rect x="272" y="324" width="420" height="280" fill="#E1E3E8" />
                                </g>
                            </g>
                            <g class="su-intro__drop su-intro__drop--3">
                                <g class="su-intro__card su-intro__card--3">
                                    <rect x="284" y="338" width="420" height="280" fill="#0B0C10" />
                                </g>
                            </g>
                            <g class="su-intro__wallet">
                                <rect x="300" y="370" width="420" height="290" fill="#5D87FF" />
                                <rect class="su-intro__chip" x="350.4" y="422.2" width="79.8" height="63.8" fill="#FFFFFF" />
                                <rect class="su-intro__bar" x="350.4" y="573" width="168" height="26.1" fill="#FFFFFF" />
                            </g>
                        </g>
                    </svg>
                    <span class="su-intro__mark-clip" :class="{ 'su-intro__mark-clip--ready': markWidth > 0 }"
                        ><span ref="mark" class="su-intro__mark"
                            ><span
                                v-for="(l, i) in MARK"
                                :key="i"
                                class="su-intro__letter"
                                :class="{ 'su-intro__dot': l.dot }"
                                :style="{ '--at': `${l.at}ms` }"
                                >{{ l.ch }}</span
                            ></span
                        ></span
                    >
                </div>
                <div class="su-intro__title-wrap">
                    <p
                        ref="title"
                        class="su-intro__title"
                        :class="{ 'su-intro__title--placed': leaving }"
                        :style="{ ...titleStyle, ...titleBox }"
                    >
                        <template v-for="(w, i) in WORDS" :key="i"
                            ><span class="su-intro__word" :class="{ 'su-intro__accent': w.accent }" :style="{ '--i': i }"
                                >{{ w.text }}<SwissFlag v-if="w.accent" class="su-intro__flag" /></span
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
}

/* Le porte-monnaie (carte bleue) tombe en premier, de moins haut, en fondu, un seul rebond. */
.su-intro__wallet {
    animation: su-intro-wallet 700ms linear both;
}

/* Les trois cartes tombent dedans, deux rebonds secs, à 150 ms d'écart. */
.su-intro__drop {
    animation: su-intro-drop 750ms linear both;
}
.su-intro__drop--1 {
    animation-delay: 300ms;
}
.su-intro__drop--2 {
    animation-delay: 450ms;
}
.su-intro__drop--3 {
    animation-delay: 600ms;
}

/* Éventail, carte noire d'abord, avec un léger dépassement d'angle avant de se poser. */
.su-intro__card {
    transform-box: view-box;
    transform-origin: 300px 650px;
    animation: su-intro-fan 500ms linear both;
}
.su-intro__card--1 {
    --su-angle: -21deg;
    animation-delay: 1750ms;
}
.su-intro__card--2 {
    --su-angle: -14deg;
    animation-delay: 1650ms;
}
.su-intro__card--3 {
    --su-angle: -7deg;
    animation-delay: 1550ms;
}

.su-intro__chip {
    transform-box: fill-box;
    transform-origin: center;
    animation: su-intro-grow 300ms cubic-bezier(0.2, 0.8, 0.2, 1) 1700ms both;
}

.su-intro__bar {
    transform-box: fill-box;
    transform-origin: left center;
    animation: su-intro-draw 300ms cubic-bezier(0.2, 0.8, 0.2, 1) 1850ms both;
}

/* « Spend.Up » : boîte à sa largeur finale dès le départ (le logo est centré d'un bloc), les lettres y montent. */
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

    // + padding droit : la boîte est en border-box
    &--ready {
        width: calc(var(--mw) + 0.12em);
        margin-left: calc(10px * var(--s));
    }
}

.su-intro__letter {
    display: inline-block;
    animation: su-intro-rise 450ms cubic-bezier(0.2, 0.9, 0.25, 1) var(--at) both;

    // Le point bleu tombe d'en haut avec un rebond
    &.su-intro__dot {
        animation: su-intro-dot 450ms linear var(--at) both;
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

/* Sous-titre hors flux : une seule ligne, positionnée et réduite par le script (origine en haut à gauche) */
.su-intro__title {
    position: fixed;
    margin: 0;
    transform-origin: top left;
    text-align: left;
    white-space: nowrap;
    color: #0b0c10;

    /* Posé sur le h1 : même largeur, mêmes retours à la ligne */
    &--placed {
        white-space: normal;

        .su-intro__word {
            transform-origin: top left;
        }
    }
}

.su-intro__word {
    display: inline-block;
    // Écriture mot par mot, dès que « Up » est monté (3,3 s)
    animation: su-intro-word 650ms cubic-bezier(0.2, 0.8, 0.2, 1) calc(3100ms + var(--i) * 160ms) both;
}

.su-intro__accent {
    color: #5d87ff;
}

// Mêmes mesures que .home-hero__flag : le drapeau se pose exactement sur celui du h1
.su-intro__flag {
    width: 0.72em;
    height: 0.72em;
    margin-left: 0.22em;
    vertical-align: -0.04em; // pied du drapeau sur la ligne de base des capitales
}

// Lettre qui monte depuis sous la boîte (140 % : au-delà du padding bas de la boîte)
@keyframes su-intro-rise {
    from {
        transform: translateY(140%);
    }
    to {
        transform: none;
    }
}
@keyframes su-intro-dot {
    0% {
        transform: translateY(-240%);
        animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
    }
    56% {
        transform: none;
        animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
    }
    78% {
        transform: translateY(-20%);
        animation-timing-function: cubic-bezier(0.4, 0, 0.8, 1);
    }
    100% {
        transform: none;
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
// Chute d'une carte (unités du viewBox), deux rebonds décroissants
@keyframes su-intro-drop {
    0% {
        transform: translateY(-650px);
        animation-timing-function: cubic-bezier(0.45, 0, 1, 1);
    }
    37% {
        transform: none;
        animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
    }
    57% {
        transform: translateY(-65px);
        animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
    }
    77% {
        transform: none;
        animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
    }
    89% {
        transform: translateY(-16px);
        animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
    }
    100% {
        transform: none;
    }
}
@keyframes su-intro-wallet {
    0% {
        opacity: 0;
        transform: translateY(-380px);
        animation-timing-function: cubic-bezier(0.45, 0, 1, 1);
    }
    21% {
        opacity: 1;
    }
    36% {
        transform: none;
        animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
    }
    57% {
        transform: translateY(-45px);
        animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
    }
    79% {
        transform: none;
        animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
    }
    89% {
        transform: translateY(-10px);
        animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
    }
    100% {
        opacity: 1;
        transform: none;
    }
}
@keyframes su-intro-fan {
    0% {
        transform: rotate(0deg);
        animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    70% {
        transform: rotate(calc(var(--su-angle) * 1.25));
        animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
    }
    100% {
        transform: rotate(var(--su-angle));
    }
}
@keyframes su-intro-grow {
    from {
        transform: scaleY(0);
    }
    to {
        transform: scaleY(1);
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
