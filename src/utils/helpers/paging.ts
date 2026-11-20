/**
 * Page suivante à demander d’après le nombre d’éléments déjà chargés.
 * Après une suppression locale, les offsets serveur reculent d’un cran : repartir de `page + 1`
 * sauterait un élément. On recharge la page qui contient le premier élément manquant ; l’appelant
 * fusionne par `publicId`, donc les éléments déjà connus ne sont pas doublés.
 * @param loaded Nombre d’éléments déjà chargés.
 * @param pageSize Taille de page de la liste.
 * @param fallbackPageSize Taille utilisée si `pageSize` n’est pas un entier positif.
 */
export function nextPageFromLoaded(loaded: number, pageSize: number, fallbackPageSize = 50): number {
    const size = pageSize > 0 ? pageSize : Math.max(1, fallbackPageSize);
    return Math.floor(Math.max(0, loaded) / size) + 1;
}
