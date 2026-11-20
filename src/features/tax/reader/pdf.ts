import type { PDFDocumentProxy } from 'pdfjs-dist';
import { readForm } from './engine';
import { findProfile } from './profiles';
import type { PageTokens, ReadReport } from './types';

/** Texte positionné de chaque page, via un document pdf.js déjà ouvert (utilisable avec la build Node de pdf.js). */
export async function extractPages(pdf: Pick<PDFDocumentProxy, 'numPages' | 'getPage'>): Promise<PageTokens[]> {
    const pages: PageTokens[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const content = await (await pdf.getPage(pageNumber)).getTextContent();
        const tokens: PageTokens['tokens'] = [];
        for (const item of content.items) {
            if (!('str' in item)) continue;
            tokens.push({ text: item.str, x: item.transform[4], w: item.width, y: item.transform[5], h: item.height || undefined });
        }
        pages.push({ page: pageNumber, tokens });
    }
    return pages;
}

/** Lit un document déjà extrait : `null` si aucun profil ne le reconnaît. */
export function readPages(pages: PageTokens[], labelFor?: (target: string) => string): ReadReport | null {
    const text = pages.flatMap((page) => page.tokens.map((token) => token.text)).join(' ');
    const profile = findProfile(text);
    return profile ? readForm(pages, profile, labelFor) : null;
}

let pdfjsReady: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfjs() {
    pdfjsReady ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfjs;
    });
    return pdfjsReady;
}

/** Ouvre un PDF avec pdf.js sur l'appareil (aucun envoi réseau), pour l'afficher. */
export async function openPdfDocument(blob: Blob): Promise<PDFDocumentProxy> {
    const { getDocument } = await loadPdfjs();
    return getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
}

/** Lit le PDF sur l'appareil (aucun envoi réseau) : rapport de lecture, ou `null` si le format n'est pas reconnu. */
export async function readTaxPdf(file: File, labelFor?: (target: string) => string): Promise<ReadReport | null> {
    const { getDocument } = await loadPdfjs();
    const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
        return readPages(await extractPages(await task.promise), labelFor);
    } finally {
        void task.destroy();
    }
}
