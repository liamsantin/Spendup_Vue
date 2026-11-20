/** Drapeau de session : « cette déclaration vient d'être importée », pour n'afficher le message d'import qu'une fois. */
const IMPORTED_FLAG = 'spendup.tax.imported';

export function readImportedFlag(): string | null {
    try {
        return sessionStorage.getItem(IMPORTED_FLAG);
    } catch {
        return null;
    }
}

export function writeImportedFlag(value: string | null) {
    try {
        if (value) sessionStorage.setItem(IMPORTED_FLAG, value);
        else sessionStorage.removeItem(IMPORTED_FLAG);
    } catch {
        /* navigation privée : le message d’import ne survit pas au changement de page */
    }
}
