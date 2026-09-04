<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseIcon from './BaseIcon.vue';
import BurgerButton from './BurgerButton.vue';
import NavLeaf from './NavLeaf.vue';
import NavRow from './NavRow.vue';
import Logo from '@/layouts/full/logo/Logo.vue';
import { useIsMobile } from '../composables/useBreakpoint';
import { useScrollLock } from '../composables/useScrollLock';
import { SHELL_DETAIL_ENABLED } from '../config';
import type { NavItem, NavLeaf as NavLeafType } from '../types/navigation';

const props = withDefaults(
    defineProps<{
        /** Onglets principaux, alignés en haut de la colonne. */
        items?: NavItem[];
        /** Onglets secondaires, épinglés en bas de la colonne. */
        bottomItems?: NavItem[];
        /** Intitulé affiché à côté du burger une fois la colonne déployée. */
        title?: string;
    }>(),
    { items: () => [], bottomItems: () => [], title: 'Menu' }
);

/** Colonne déployée. */
const open = defineModel<boolean>('open', { default: false });
/** Onglet principal ouvert : accordéon des sous-onglets + colonne de détail. */
const openId = defineModel<string | null>('openId', { default: null });
/** Entrée terminale sélectionnée, tous niveaux confondus. */
const activeId = defineModel<string | null>('activeId', { default: null });

const emit = defineEmits<{ select: [leaf: NavLeafType] }>();

const { t } = useI18n();
const isMobile = useIsMobile();
/** Sur mobile, le volet montre soit la liste, soit le détail de l'onglet ouvert. */
const mobilePane = ref<'main' | 'detail'>('main');
const surface = ref<HTMLElement | null>(null);

const allItems = computed(() => [...props.items, ...props.bottomItems]);
const openItem = computed<NavItem | null>(() => allItems.value.find((item) => item.id === openId.value) ?? null);
const detailGroups = computed(() => (SHELL_DETAIL_ENABLED && open.value && openItem.value?.detail) || []);
const hasDetail = computed(() => SHELL_DETAIL_ENABLED && detailGroups.value.length > 0);

function toggle() {
    open.value = !open.value;
}

function toggleItem(item: NavItem) {
    // replié, un clic déploie la colonne sur l'onglet visé
    if (!open.value) {
        open.value = true;
        openId.value = item.id;
        return;
    }
    const isLeafTab = !item.children?.length && !item.detail?.length;
    // un onglet sans sous-menu reste sélectionné : le refermer casserait le surlignage de la page courante
    if (isLeafTab) {
        openId.value = item.id;
        return;
    }
    const closing = openId.value === item.id;
    openId.value = closing ? null : item.id;
    // sur mobile, ouvrir un onglet pousse vers le panneau de détail
    if (SHELL_DETAIL_ENABLED && isMobile.value && !closing && !!item.detail?.length) mobilePane.value = 'detail';
}

function selectLeaf(leaf: NavLeafType) {
    activeId.value = leaf.id;
    emit('select', leaf);
    // sur mobile le volet est un overlay : on le referme après le choix
    if (isMobile.value) open.value = false;
}

/* ── overlay mobile : scroll, focus, échappement ───────── */
useScrollLock(() => open.value && isMobile.value);

let lastFocused: HTMLElement | null = null;

watch(open, async (isOpen) => {
    if (isOpen) mobilePane.value = 'main';
    if (!isMobile.value) return;

    if (isOpen) {
        lastFocused = document.activeElement as HTMLElement | null;
        await nextTick();
        surface.value?.focus();
    } else {
        lastFocused?.focus?.();
        lastFocused = null;
    }
});

function onKeydown(event: KeyboardEvent) {
    // le volet mobile est modal : Échap doit le refermer
    if (event.key === 'Escape' && open.value && isMobile.value) open.value = false;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
    <div class="sidebar" :class="{ 'is-expanded': open, 'detail-off': !SHELL_DETAIL_ENABLED }">
        <div
            ref="surface"
            class="surface"
            tabindex="-1"
            :role="isMobile ? 'dialog' : undefined"
            :aria-modal="isMobile && open ? 'true' : undefined"
            :aria-label="isMobile ? title : undefined"
        >
            <div class="slider" :class="{ 'show-detail': mobilePane === 'detail' }">
                <!-- ── colonne unique : icônes au repos, icônes + libellés déployée ── -->
                <nav class="rail" :aria-label="title">
                    <header class="head">
                        <BurgerButton :open="open" :label="t('nav.toggleMenu')" @click="toggle" />
                        <div class="head__title">
                            <Logo />
                        </div>
                        <button class="head__close" type="button" :aria-label="t('nav.closeMenu')" @click="open = false">
                            <BaseIcon name="close" :size="18" />
                        </button>
                    </header>
                    <div class="rule" />

                    <div class="rail__scroll">
                        <ul class="nav">
                            <NavRow
                                v-for="(item, i) in items"
                                :key="item.id"
                                :item="item"
                                :open="openId === item.id"
                                :active-id="activeId"
                                :expanded="open"
                                :index="i"
                                @toggle="toggleItem"
                                @select="selectLeaf"
                            />
                        </ul>

                        <div class="rule rule--bottom" />
                        <ul class="nav nav--bottom">
                            <NavRow
                                v-for="(item, i) in bottomItems"
                                :key="item.id"
                                :item="item"
                                :open="openId === item.id"
                                :active-id="activeId"
                                :expanded="open"
                                :index="i + items.length"
                                @toggle="toggleItem"
                                @select="selectLeaf"
                            />
                        </ul>
                    </div>
                </nav>

                <!-- ── colonne de détail de l'onglet ouvert ── -->
                <div class="panel" :class="{ 'has-detail': hasDetail }">
                    <div class="panel__inner">
                        <header class="back">
                            <button class="back__btn" type="button" @click="mobilePane = 'main'">
                                <BaseIcon name="chevron-left" :size="20" />
                                <span>{{ openItem?.label ?? title }}</span>
                            </button>
                        </header>
                        <TransitionGroup name="detail" tag="div" class="panel__scroll">
                            <section v-for="(group, gi) in detailGroups" :key="group.id" class="group" :style="{ '--i': gi }">
                                <header v-if="group.title" class="group__head">
                                    <span>{{ group.title }}</span>
                                    <BaseIcon v-if="group.action" :name="group.action" :size="18" />
                                </header>
                                <ul>
                                    <li v-for="leaf in group.items" :key="leaf.id">
                                        <NavLeaf :leaf="leaf" :active="activeId === leaf.id" wide @select="selectLeaf" />
                                    </li>
                                </ul>
                                <div v-if="gi < detailGroups.length - 1" class="group__rule" />
                            </section>
                        </TransitionGroup>
                    </div>
                </div>
            </div>
        </div>

        <!-- poignée : accrochée au bord extérieur de la surface, elle suit l'expansion -->
        <button class="handle" type="button" :aria-expanded="open" :aria-label="t('nav.toggleMenu')" @click="toggle">
            <BaseIcon name="chevron-right" :size="14" />
        </button>

        <!-- voile de fond, uniquement sur mobile -->
        <div class="scrim" @click="open = false" />
    </div>
</template>

<style scoped>
.sidebar {
    position: relative;
    display: flex;
    align-items: stretch;
    height: 100%;
    font-family: var(--font-ui);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
}

/* une seule surface de verre pour la colonne et le détail */
.surface {
    display: flex;
    height: 100%;
    overflow: hidden;
    border-radius: var(--radius-surface);
    background: var(--surface);
    border: 1px solid var(--stroke);
    backdrop-filter: var(--blur);
    box-shadow: var(--shadow-rest);
    transition: box-shadow 0.6s var(--ease);
}
.surface:focus {
    outline: none;
}
.is-expanded .surface {
    box-shadow: var(--shadow-lifted);
}

.slider {
    display: flex;
    height: 100%;
}

/* ── colonne d'icônes, qui s'élargit ───────────────────── */
.rail {
    position: relative;
    z-index: 2;
    flex: none;
    width: var(--rail-w);
    display: flex;
    flex-direction: column;
    padding: 18px 0 22px;
    overflow: hidden;
    /* pas de bord ici : le filet de séparation est porté par la colonne de détail,
     sinon il se dédouble avec le sien et subsiste quand elle est fermée */
    transition: width var(--dur-expand) var(--ease);
}
.is-expanded .rail {
    width: var(--rail-open-w);
}

.rail__scroll {
    flex: 1;
    min-height: 0;
    margin-top: 16px;
    overflow-y: auto;
    scrollbar-width: none;
    display: flex;
    flex-direction: column;
}
.rail__scroll::-webkit-scrollbar {
    display: none;
}

/* en-tête : le burger occupe le même emplacement qu'une icône de menu */
.head {
    display: flex;
    align-items: center;
    gap: 12px;
    height: var(--slot);
    padding: 0 var(--gutter);
}
.head__title {
    flex: 1;
    min-width: 0;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(-8px);
    transition:
        opacity 0.45s var(--ease),
        transform 0.55s var(--ease),
        visibility 0s linear 0.45s;
}
.is-expanded .head__title {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: none;
    transition-delay: 0.1s;
    transition:
        opacity 0.45s var(--ease) 0.1s,
        transform 0.55s var(--ease) 0.1s,
        visibility 0s linear 0s;
}
.head__title :deep(.spendup-logo) {
    min-width: 0;
    gap: 7px;
}
.head__title :deep(.spendup-logo__icon) {
    width: 26px;
    height: 26px;
}
.head__title :deep(.spendup-logo__text) {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ink) !important;
    font-size: 17px !important;
    font-weight: 650 !important;
    line-height: 1;
    letter-spacing: -0.02em;
}

.rule {
    height: 1px;
    margin: 18px var(--gutter) 0;
    background: var(--hair);
    opacity: 0;
    transition: opacity 0.5s var(--ease) 0.08s;
}
.is-expanded .rule {
    opacity: 1;
}

.nav {
    list-style: none;
    margin: 0;
    padding: 0 var(--gutter);
    display: flex;
    flex-direction: column;
    gap: var(--row-gap);
}
.nav--bottom {
    padding-top: 14px;
}
/* le filet est ce qui pousse le groupe du bas, pour rester collé au-dessus de lui.
   Il garde la même retraite que celui de l'en-tête : il ne touche jamais les bords
   du rail, et reste donc court à l'état replié. */
.rule--bottom {
    margin-top: auto;
    opacity: 1;
}

/* ── colonne de détail ─────────────────────────────────── */
.panel {
    position: relative;
    z-index: 1;
    flex: none;
    width: 0;
    overflow: hidden;
    border-left: 1px solid transparent;
    transition:
        width var(--dur-expand) var(--ease),
        border-color 0.5s var(--ease);
}
.is-expanded .panel.has-detail {
    width: var(--detail-w);
    border-left-color: var(--hair);
}

.panel__inner {
    display: flex;
    flex-direction: column;
    width: var(--detail-w);
    height: 100%;
    padding: 26px 16px;
    opacity: 0;
    transform: translateX(-14px);
    transition:
        opacity 0.5s var(--ease),
        transform 0.65s var(--ease);
}
.is-expanded .panel__inner {
    opacity: 1;
    transform: none;
}
.panel__scroll {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow-y: auto;
    scrollbar-width: none;
}
.panel__scroll::-webkit-scrollbar {
    display: none;
}

.group {
    opacity: 0;
    transform: translateX(-14px);
    transition:
        opacity 0.5s var(--ease) calc(var(--i) * 60ms + 200ms),
        transform 0.6s var(--ease) calc(var(--i) * 60ms + 200ms);
}
.is-expanded .group {
    opacity: 1;
    transform: none;
}
.sidebar:not(.is-expanded) .group {
    transition-duration: 0.18s;
    transition-delay: 0s;
}
.group ul {
    list-style: none;
    margin: 0;
    padding: 0;
}
.group__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 6px;
    color: var(--ink-muted);
    font-size: 14.5px;
    font-weight: 560;
    white-space: nowrap;
}
.group__head svg {
    opacity: 0.55;
}
.group__rule {
    height: 1px;
    margin: 14px 14px 6px;
    background: var(--hair);
}

/* changement d'onglet : les groupes se croisent */
.is-expanded .group.detail-enter-from,
.is-expanded .group.detail-leave-to {
    opacity: 0;
    transform: translateX(16px);
}
.is-expanded .group.detail-enter-active {
    transition:
        opacity 0.42s var(--ease) calc(var(--i) * 55ms + 60ms),
        transform 0.5s var(--ease) calc(var(--i) * 55ms + 60ms);
}
.is-expanded .group.detail-leave-active {
    position: absolute;
    left: 0;
    right: 0;
    transition:
        opacity 0.22s var(--ease),
        transform 0.22s var(--ease);
}
.is-expanded .group.detail-move {
    transition: transform 0.5s var(--ease);
}

/* ── poignée ───────────────────────────────────────────── */
.handle {
    appearance: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    position: absolute;
    z-index: 3;
    top: 50%;
    right: -10px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 34px;
    margin-top: -17px;
    border-radius: 10px;
    background: var(--surface-raised);
    color: var(--ink-muted);
    box-shadow: var(--shadow-handle);
    transition:
        transform 0.55s var(--spring),
        color 0.3s;
}
.handle:hover {
    color: var(--ink);
    transform: scale(1.14);
}
.is-expanded .handle {
    transform: rotate(180deg);
}
.is-expanded .handle:hover {
    transform: rotate(180deg) scale(1.14);
}

/* ── éléments réservés au mobile ───────────────────────── */
/* masqués par le CSS et non par un v-if : le composant ne doit pas dépendre
   d'un matchMedia pour produire son markup (rendu serveur, premier paint). */
.scrim,
.head__close,
.back {
    display: none;
}

/* ── mobile : overlay + navigation à deux panneaux ─────── */
@media (max-width: 767px) {
    .handle {
        display: none;
    }

    .scrim {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 4;
        background: var(--scrim);
        backdrop-filter: blur(2px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.45s var(--ease);
    }
    .is-expanded .scrim {
        opacity: 1;
        pointer-events: auto;
    }

    /* la surface devient un volet flottant, glissé depuis la gauche */
    .surface {
        position: fixed;
        top: 12px;
        bottom: 12px;
        left: 12px;
        z-index: 5;
        width: min(calc(100vw - 24px), 380px);
        border-radius: var(--radius-overlay);
        background: var(--surface-overlay);
        box-shadow: var(--shadow-overlay);
        transform: translateX(calc(-100% - 16px));
        opacity: 0;
        pointer-events: none;
        transition:
            transform 0.6s var(--ease),
            opacity 0.4s var(--ease);
    }
    .is-expanded .surface {
        transform: none;
        opacity: 1;
        pointer-events: auto;
    }

    .slider {
        /* flex: none, sinon les deux panneaux se feraient comprimer côte à côte */
        flex: none;
        width: 200%;
        transition: transform var(--dur-slide) var(--ease);
    }
    .slider.show-detail {
        transform: translateX(-50%);
    }

    .rail,
    .is-expanded .rail {
        width: 50%;
    }
    .panel,
    .is-expanded .panel.has-detail {
        width: 50%;
        border-left: 0;
    }
    .panel__inner {
        width: 100%;
    }

    /* bloc ③ coupé : un seul panneau, le markup du détail reste en place */
    .detail-off .slider,
    .detail-off .slider.show-detail {
        width: 100%;
        transform: none;
    }
    .detail-off .rail,
    .detail-off.is-expanded .rail {
        width: 100%;
    }
    .detail-off .panel {
        display: none;
    }

    /* le burger vit dans le header sur mobile : ici une croix suffit */
    .burger {
        display: none;
    }
    .head {
        height: 46px;
        padding: 0 8px 0 20px;
    }
    .head__close {
        display: grid;
        place-items: center;
        flex: none;
        width: 34px;
        height: 34px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--hair);
        color: var(--ink);
        cursor: pointer;
    }
    .head__close:active {
        transform: scale(0.92);
    }

    .back {
        display: block;
        margin-bottom: 6px;
    }
    .back__btn {
        appearance: none;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px 8px 6px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: var(--ink);
        font: inherit;
        font-size: 16px;
        font-weight: 620;
        letter-spacing: -0.02em;
        cursor: pointer;
    }
    .back__btn:active {
        background: var(--hair);
    }
}
</style>
