<script setup lang="ts">
import type { IconName } from '../types/navigation'

/**
 * Jeu d'icônes du layout : traits de 1.6, bouts arrondis, grille de 24.
 * Pour en ajouter une, déclarer son nom dans `IconName` puis ajouter sa branche
 * ci-dessous — le type garantit qu'un nom inconnu est une erreur de compilation.
 */
withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 22 })
</script>

<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'sparkle'">
      <path
        d="M12 2.5c.35 3.1 1.4 5.4 3.1 7 1.7 1.6 3.9 2.5 6.4 2.5-2.5 0-4.7.9-6.4 2.5-1.7 1.6-2.75 3.9-3.1 7-.35-3.1-1.4-5.4-3.1-7C7.2 12.9 5 12 2.5 12c2.5 0 4.7-.9 6.4-2.5 1.7-1.6 2.75-3.9 3.1-7Z"
        fill="currentColor"
        stroke="none"
      />
    </template>

    <template v-else-if="name === 'burger'">
      <path d="M4 6.8h16M4 12h16M4 17.2h16" />
    </template>

    <template v-else-if="name === 'home'">
      <path d="M12 3.2 20.2 9v8.4a2.4 2.4 0 0 1-2.4 2.4H6.2a2.4 2.4 0 0 1-2.4-2.4V9L12 3.2Z" />
    </template>

    <template v-else-if="name === 'messages'">
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="3.4" />
      <path d="M6.6 15.4l3-3.2 2.3 2.1 2.6-3.2 2.9 4.3" />
      <circle cx="9" cy="9.4" r="1.15" />
    </template>

    <template v-else-if="name === 'integrations'">
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.2" />
      <path d="M12 8.4v7.2M8.4 12h7.2" />
    </template>

    <template v-else-if="name === 'finance'">
      <rect x="2.8" y="6" width="18.4" height="12" rx="3.2" />
      <path d="M2.8 10.2h6.4M15.4 14.6h3" />
    </template>

    <template v-else-if="name === 'threads'">
      <rect x="3" y="4.6" width="18" height="4.4" rx="1.8" />
      <path d="M4.8 9v7.6a2.8 2.8 0 0 0 2.8 2.8h8.8a2.8 2.8 0 0 0 2.8-2.8V9" />
      <path d="M10.2 13h3.6" />
    </template>

    <template v-else-if="name === 'contacts'">
      <rect x="4.2" y="2.8" width="15.6" height="18.4" rx="3" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8.6 17.4c.5-1.9 1.8-2.9 3.4-2.9s2.9 1 3.4 2.9" />
    </template>

    <template v-else-if="name === 'explore'">
      <path d="M3.4 8.4h17.2v8.8a2.6 2.6 0 0 1-2.6 2.6H6a2.6 2.6 0 0 1-2.6-2.6V8.4Z" />
      <path d="M8.6 8.4V6.6A2.6 2.6 0 0 1 11.2 4h1.6a2.6 2.6 0 0 1 2.6 2.6v1.8" />
    </template>

    <template v-else-if="name === 'folder'">
      <path
        d="M3.2 7.4A2.4 2.4 0 0 1 5.6 5h3.1c.7 0 1.4.32 1.86.87l.98 1.16h5.9A2.4 2.4 0 0 1 19.84 9.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4V7.4Z"
      />
    </template>

    <template v-else-if="name === 'folder-code'">
      <path
        d="M3.2 7.4A2.4 2.4 0 0 1 5.6 5h3.1c.7 0 1.4.32 1.86.87l.98 1.16h5.9A2.4 2.4 0 0 1 19.84 9.4v7.2a2.4 2.4 0 0 1-2.4 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4V7.4Z"
      />
      <path d="M9.9 11.6 8.2 13.4l1.7 1.8M13.7 11.6l1.7 1.8-1.7 1.8" stroke-width="1.4" />
    </template>

    <template v-else-if="name === 'search'">
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m15.8 15.8 4 4" />
    </template>

    <template v-else-if="name === 'bell'">
      <path
        d="M18 16.2H6c-.9 0-1.3-1.1-.7-1.7l.9-.9c.4-.4.6-.9.6-1.4V10a5.2 5.2 0 0 1 10.4 0v2.2c0 .5.2 1 .6 1.4l.9.9c.6.6.2 1.7-.7 1.7Z"
      />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </template>

    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8.6" r="3.6" />
      <path d="M5.4 19.6c.7-3.3 3.2-5.2 6.6-5.2s5.9 1.9 6.6 5.2" />
    </template>

    <template v-else-if="name === 'pin'">
      <path
        d="M15.6 3.6 20.4 8.4M17.4 5.4l-6.2 2.4-4.4 4.4 4.6 4.6 4.4-4.4 2.4-6.2M7.2 16.8 3.6 20.4"
      />
    </template>

    <template v-else-if="name === 'plus'">
      <path d="M12 6.4v11.2M6.4 12h11.2" />
    </template>

    <template v-else-if="name === 'minus'">
      <path d="M6.4 12h11.2" />
    </template>

    <template v-else-if="name === 'chevron-right'">
      <path d="M9.6 5.6 16 12l-6.4 6.4" />
    </template>

    <template v-else-if="name === 'chevron-left'">
      <path d="M14.4 5.6 8 12l6.4 6.4" />
    </template>

    <template v-else-if="name === 'close'">
      <path d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4" />
    </template>

    <template v-else-if="name === 'dots'">
      <circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </template>

    <!-- repli visible : une icône manquante ne doit pas passer inaperçue -->
    <template v-else>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4" stroke-dasharray="3 3" />
      <path d="M12 15.6v.01M9.8 9.6a2.2 2.2 0 1 1 2.9 2.1c-.5.2-.7.6-.7 1.1v.4" />
    </template>
  </svg>
</template>

<style scoped>
.icon {
  display: block;
  flex: none;
}
</style>
