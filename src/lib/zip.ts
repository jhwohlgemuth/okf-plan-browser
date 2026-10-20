export interface ZipTextFile {
  path: string;
  content: string;
}

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function header(size: number, write: (view: DataView) => void): Uint8Array {
  const bytes = new Uint8Array(size);
  write(new DataView(bytes.buffer));
  return bytes;
}

/** Create a UTF-8 ZIP using the portable uncompressed storage method. */
export function createTextZip(files: ZipTextFile[]): Uint8Array {
  if (files.length > 0xffff) throw new Error('ZIP contains too many files.');

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path.replace(/\\/g, '/'));
    const content = encoder.encode(file.content);
    if (name.length > 0xffff) throw new Error(`ZIP path is too long: ${file.path}`);
    const checksum = crc32(content);

    const localHeader = header(30, view => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(12, 0x0021, true);
      view.setUint32(14, checksum, true);
      view.setUint32(18, content.length, true);
      view.setUint32(22, content.length, true);
      view.setUint16(26, name.length, true);
    });
    localParts.push(localHeader, name, content);

    const centralHeader = header(46, view => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(14, 0x0021, true);
      view.setUint32(16, checksum, true);
      view.setUint32(20, content.length, true);
      view.setUint32(24, content.length, true);
      view.setUint16(28, name.length, true);
      view.setUint32(42, localOffset, true);
    });
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = concat(centralParts);
  const end = header(22, view => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralDirectory.length, true);
    view.setUint32(16, localOffset, true);
  });
  return concat([...localParts, centralDirectory, end]);
}

