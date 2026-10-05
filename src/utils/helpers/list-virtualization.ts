/** Render a windowed list once the collection grows past this size. */
export const LIST_VIRTUALIZE_AFTER = 50;

export function shouldVirtualize(length: number, threshold = LIST_VIRTUALIZE_AFTER): boolean {
    return length > threshold;
}
