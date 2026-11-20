/**
 * Map dont chaque écriture (`set` / `delete` / `clear`) appelle `onChange` : permet de bumper un
 * compteur réactif sans rendre la Map elle-même réactive.
 */
export function createTrackedMap<K, V>(onChange: () => void): Map<K, V> {
    const map = new Map<K, V>();
    const rawSet = map.set.bind(map);
    const rawDelete = map.delete.bind(map);
    const rawClear = map.clear.bind(map);
    map.set = (key: K, value: V) => {
        rawSet(key, value);
        onChange();
        return map;
    };
    map.delete = (key: K) => {
        const removed = rawDelete(key);
        if (removed) onChange();
        return removed;
    };
    map.clear = () => {
        if (map.size === 0) return;
        rawClear();
        onChange();
    };
    return map;
}
