import { describe, expect, it } from 'vitest';
import { buildZip, crc32 } from '@/utils/helpers/zip-helpers';

/** Relit une archive « stored » par son répertoire central : noms et contenus. */
function readZip(bytes: Uint8Array): { name: string; data: Uint8Array; crc: number }[] {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const endAt = bytes.length - 22;
    expect(view.getUint32(endAt, true)).toBe(0x06054b50);
    const count = view.getUint16(endAt + 10, true);
    let at = view.getUint32(endAt + 16, true);
    const decoder = new TextDecoder();
    const out = [];
    for (let i = 0; i < count; i++) {
        expect(view.getUint32(at, true)).toBe(0x02014b50);
        const crc = view.getUint32(at + 16, true);
        const size = view.getUint32(at + 20, true);
        const nameLength = view.getUint16(at + 28, true);
        const local = view.getUint32(at + 42, true);
        const name = decoder.decode(bytes.slice(at + 46, at + 46 + nameLength));
        expect(view.getUint32(local, true)).toBe(0x04034b50);
        const localName = view.getUint16(local + 26, true);
        const start = local + 30 + localName;
        out.push({ name, data: bytes.slice(start, start + size), crc });
        at += 46 + nameLength;
    }
    return out;
}

describe('zip-helpers', () => {
    it('calcule le CRC-32 de référence', () => {
        expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
        expect(crc32(new Uint8Array())).toBe(0);
    });

    it('relit chaque fichier avec son nom UTF-8, son contenu et son CRC', () => {
        const a = new TextEncoder().encode('%PDF-1.7 premier');
        const b = new Uint8Array([0, 1, 2, 255]);
        const zip = buildZip(
            [
                { name: '01 - Pilier 3a - attestation.pdf', data: a },
                { name: '00 - Sommaire déposé.txt', data: b }
            ],
            new Date(2026, 10, 17, 10, 30)
        );
        const files = readZip(zip);
        expect(files.map((file) => file.name)).toEqual(['01 - Pilier 3a - attestation.pdf', '00 - Sommaire déposé.txt']);
        expect([...files[0].data]).toEqual([...a]);
        expect([...files[1].data]).toEqual([...b]);
        expect(files[0].crc).toBe(crc32(a));
    });

    it('produit une archive vide valide', () => {
        expect(readZip(buildZip([]))).toEqual([]);
    });
});
