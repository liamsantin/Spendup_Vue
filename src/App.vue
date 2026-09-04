<script setup lang="ts">
import { ref } from 'vue'
import AppShell from './components/AppShell.vue'
import { primaryNav, secondaryNav } from './data/navigation'
import type { NavLeaf } from './types/navigation'

/*
 * Démonstration du template : l'application fournit les données de navigation et
 * garde la main sur l'état (onglet ouvert, entrée sélectionnée, requête). Dans un
 * vrai projet, `onSelect` déclencherait la navigation ou le chargement du contenu.
 */
const openId = ref<string | null>('threads')
const activeId = ref<string | null>('threads-enlarz')
const lastSelected = ref<NavLeaf | null>(null)
const lastSearch = ref('')

function onSelect(leaf: NavLeaf) {
  lastSelected.value = leaf
}
</script>

<template>
  <AppShell
    v-model:open-id="openId"
    v-model:active-id="activeId"
    :items="primaryNav"
    :bottom-items="secondaryNav"
    :notifications="3"
    title="Menu"
    @select="onSelect"
    @search-submit="lastSearch = $event"
  >
    <div class="demo">
      <h1>Sidebar</h1>
      <p>
        Ouvrez le menu depuis le burger — dans le rail sur grand écran, dans le header sur mobile —
        puis touchez un onglet principal pour dérouler ses sous-onglets et son contenu.
      </p>
      <dl class="demo__state">
        <dt>Onglet ouvert</dt>
        <dd>{{ openId ?? '—' }}</dd>
        <dt>Entrée sélectionnée</dt>
        <dd>{{ lastSelected?.label ?? activeId ?? '—' }}</dd>
        <dt>Recherche validée</dt>
        <dd>{{ lastSearch || '—' }}</dd>
      </dl>
    </div>
  </AppShell>
</template>

<style scoped>
.demo {
  padding: 18px 12px;
  max-width: 52ch;
}
.demo h1 {
  margin: 0 0 12px;
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -0.03em;
}
.demo p {
  margin: 0;
  color: var(--ink-muted);
  font-size: 15px;
  line-height: 1.6;
}

.demo__state {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  margin: 26px 0 0;
  font-size: 14px;
}
.demo__state dt {
  color: var(--ink-muted);
}
.demo__state dd {
  margin: 0;
  font-weight: 550;
}

@media (max-width: 767px) {
  .demo {
    padding: 14px 6px;
    max-width: none;
  }
  .demo h1 {
    font-size: 24px;
  }
  .demo p {
    font-size: 14px;
  }
}
</style>
