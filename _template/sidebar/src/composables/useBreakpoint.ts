import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from 'vue'

/**
 * Point de rupture unique du layout.
 *
 * Une media query ne pouvant pas lire une variable CSS, cette valeur est la source
 * de vérité côté script et doit rester alignée avec les `@media (max-width: 767px)`
 * des composants du layout. En changer ici sans changer le CSS désynchroniserait le
 * comportement (volet en overlay, navigation à deux panneaux) de l'apparence.
 */
export const MOBILE_BREAKPOINT = 767

/** Vrai tant que la fenêtre est au plus large que `maxWidth`. Faux au rendu serveur. */
export function useIsMobile(maxWidth: number = MOBILE_BREAKPOINT): Readonly<Ref<boolean>> {
  const isMobile = ref(false)
  let mq: MediaQueryList | undefined

  function sync(event: MediaQueryList | MediaQueryListEvent) {
    isMobile.value = event.matches
  }

  onMounted(() => {
    mq = window.matchMedia(`(max-width: ${maxWidth}px)`)
    sync(mq)
    mq.addEventListener('change', sync)
  })

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', sync)
  })

  return readonly(isMobile)
}
