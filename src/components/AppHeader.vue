<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import BurgerButton from './BurgerButton.vue'

const props = withDefaults(
  defineProps<{
    /** État du menu, pour l'aspect et l'aria du burger. */
    menuOpen?: boolean
    /** Nombre de notifications non lues. 0 masque la pastille. */
    notifications?: number
    searchPlaceholder?: string
    searchLabel?: string
  }>(),
  { notifications: 0, searchPlaceholder: 'Rechercher…', searchLabel: 'Rechercher' },
)

/** Requête de recherche, pilotable de l'extérieur. */
const search = defineModel<string>('search', { default: '' })

const emit = defineEmits<{
  'toggle-menu': []
  /** Validation du champ de recherche (Entrée). */
  'search-submit': [value: string]
  'notifications-click': []
  'account-click': []
}>()

const searchOpen = ref(false)
const input = ref<HTMLInputElement | null>(null)

const bellLabel = computed(() =>
  props.notifications > 0
    ? `Notifications, ${props.notifications} non lue${props.notifications > 1 ? 's' : ''}`
    : 'Notifications',
)

async function openSearch() {
  searchOpen.value = true
  await nextTick()
  input.value?.focus()
}

/** Ne se referme que si le champ est vide, pour ne pas perdre une saisie. */
function closeSearch() {
  if (!search.value) searchOpen.value = false
}

function toggleSearch() {
  if (searchOpen.value) closeSearch()
  else openSearch()
}

function resetSearch() {
  search.value = ''
  searchOpen.value = false
  input.value?.blur()
}
</script>

<template>
  <header class="bar">
    <!-- mobile : le burger remplace le rail et ouvre le volet -->
    <BurgerButton class="brand" :open="menuOpen" @click="emit('toggle-menu')" />

    <!-- recherche : l'icône se déplie en champ -->
    <div class="search" :class="{ 'is-open': searchOpen }" role="search">
      <button class="orb" type="button" :aria-label="searchLabel" @click="toggleSearch">
        <BaseIcon name="search" :size="20" />
      </button>
      <input
        ref="input"
        v-model="search"
        class="search__input"
        type="text"
        :placeholder="searchPlaceholder"
        :aria-label="searchLabel"
        :tabindex="searchOpen ? 0 : -1"
        @keydown.enter="emit('search-submit', search)"
        @keydown.esc="resetSearch"
        @blur="closeSearch"
      />
    </div>

    <div class="bar__spacer" />

    <div class="bar__actions">
      <button
        class="orb"
        type="button"
        :aria-label="bellLabel"
        @click="emit('notifications-click')"
      >
        <BaseIcon name="bell" :size="20" />
        <span v-if="notifications > 0" class="ping" />
      </button>

      <div class="bar__sep" />

      <button class="avatar" type="button" aria-label="Mon compte" @click="emit('account-click')">
        <BaseIcon name="user" :size="20" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  height: var(--header-h);
  /* même galbe que la surface de la sidebar */
  border-radius: var(--radius-header);
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  backdrop-filter: var(--blur);
  box-shadow: var(--shadow-rest);
  color: var(--ink);
  font-family: var(--font-ui);
  animation: bar-in 0.8s var(--ease) both;
}

@keyframes bar-in {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(0.99);
  }
}

.bar__spacer {
  flex: 1;
  min-width: 0;
}

.bar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.bar__sep {
  width: 1px;
  height: 24px;
  margin: 0 6px;
  background: var(--hair);
}

/* bouton rond en verre, même vocabulaire que les icônes du rail */
.orb {
  position: relative;
  appearance: none;
  border: 0;
  padding: 0;
  display: grid;
  place-items: center;
  flex: none;
  width: var(--slot);
  height: var(--slot);
  border-radius: 50%;
  background: transparent;
  color: var(--ink-mute);
  cursor: pointer;
  transition:
    background 0.35s var(--ease),
    box-shadow 0.35s var(--ease),
    transform 0.4s var(--spring),
    color 0.3s;
}
.orb:hover {
  color: var(--ink);
  background: var(--surface-hover);
  transform: scale(1.08);
}
.orb:active {
  transform: scale(0.94);
}

/* bouton d'ouverture du menu : réservé au mobile */
.brand {
  display: none;
}

/* pastille de notification, avec une onde discrète */
.ping {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
}
.ping::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  opacity: 0.6;
  animation: ping 2.6s var(--ease) infinite;
}
@keyframes ping {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  70%,
  100% {
    transform: scale(2.1);
    opacity: 0;
  }
}

.avatar {
  appearance: none;
  border: 0;
  padding: 0;
  display: grid;
  place-items: center;
  flex: none;
  width: var(--slot);
  height: var(--slot);
  border-radius: 50%;
  background: var(--ink);
  color: var(--on-ink);
  cursor: pointer;
  box-shadow: 0 14px 30px -16px rgba(16, 16, 20, 0.75);
  transition:
    transform 0.4s var(--spring),
    box-shadow 0.35s var(--ease);
}
.avatar:hover {
  transform: scale(1.07);
}
.avatar:active {
  transform: scale(0.95);
}

/* champ de recherche */
.search {
  display: flex;
  align-items: center;
  min-width: var(--slot);
  border-radius: 26px;
  transition:
    background 0.45s var(--ease),
    box-shadow 0.45s var(--ease);
}
.search.is-open {
  background: var(--surface-hover);
  box-shadow: var(--shadow-pill-soft);
}
.search.is-open .orb:hover {
  background: transparent;
  transform: none;
}

.search__input {
  width: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: none;
  opacity: 0;
  color: var(--ink);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition:
    width 0.6s var(--ease),
    opacity 0.35s var(--ease),
    padding 0.5s var(--ease);
}
.search.is-open .search__input {
  width: 220px;
  /* plancher de lisibilité quand la sidebar déployée comprime le header */
  min-width: 88px;
  padding: 0 14px 0 2px;
  opacity: 1;
}
.search__input::placeholder {
  color: var(--ink-muted);
}

@media (max-width: 767px) {
  .bar {
    height: var(--header-h-mobile);
    border-radius: var(--radius-header-mobile);
    padding: 0 8px;
    gap: 2px;
  }
  .brand {
    display: grid;
    /* --burger-size l'emporte proprement sur la taille par défaut, sans lutte
       de spécificité avec le style scopé du composant */
    --burger-size: 40px;
  }
  .orb,
  .avatar {
    width: 40px;
    height: 40px;
  }
  .bar__sep {
    margin: 0 2px;
  }
  .search.is-open .search__input {
    width: min(38vw, 160px);
    font-size: 14.5px;
  }
  .orb:hover {
    background: transparent;
    transform: none;
  }
  .avatar:hover {
    transform: none;
  }
}
</style>
