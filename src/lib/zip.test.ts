import { describe, expect, it } from 'vitest';
import { createTextZip } from '@/lib/zip';

const decoder = new TextDecoder();

function readStoredFiles(zip: Uint8Array): Map<string, string> {
  const files = new Map<string, string>();
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    expect(view.getUint16(offset + 8, true)).toBe(0);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(zip.subarray(nameStart, nameStart + nameLength));
    files.set(name, decoder.decode(zip.subarray(contentStart, contentStart + size)));
    offset = contentStart + size;
  }
  expect(view.getUint32(offset, true)).toBe(0x02014b50);
  return files;
}

describe('createTextZip', () => {
  it('preserves folder paths and UTF-8 text in a valid stored ZIP', () => {
    const zip = createTextZip([
      { path: '.agents/skills/planning/SKILL.md', content: '# Planning\n' },
      { path: '.agents\\skills\\planning\\references\\notes.md', content: 'café\n' },
    ]);

    expect(new DataView(zip.buffer).getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(readStoredFiles(zip)).toEqual(new Map([
      ['.agents/skills/planning/SKILL.md', '# Planning\n'],
      ['.agents/skills/planning/references/notes.md', 'café\n'],
    ]));
  });
});

