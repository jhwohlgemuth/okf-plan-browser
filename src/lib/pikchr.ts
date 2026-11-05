const PIKCHR_PLAINTEXT_ERRORS = 0x0001;
const PIKCHR_DARK_MODE = 0x0002;
const MAX_SOURCE_BYTES = 256 * 1024;

type PikchrRenderer = typeof import('pikchr-wasm/size')['default'];

let rendererPromise: Promise<PikchrRenderer> | undefined;

async function renderer(): Promise<PikchrRenderer> {
  rendererPromise ??= import('pikchr-wasm/size').then(async module => {
    await module.default.loadWASM();
    return module.default;
  });
  return rendererPromise;
}

export function isPikchrPath(path: string): boolean {
  return path.split(/[?#]/, 1)[0]?.toLowerCase().endsWith('.pikchr') ?? false;
}

/** Render Pikchr source locally to an SVG string using the lazy-loaded WASM runtime. */
export async function renderPikchr(source: string, dark: boolean): Promise<string> {
  const bytes = new TextEncoder().encode(source).length;
  if (!source.trim()) throw new Error('The Pikchr source is empty.');
  if (bytes > MAX_SOURCE_BYTES) throw new Error('The Pikchr source exceeds the 256 KB rendering limit.');

  const pikchr = await renderer();
  const flags = PIKCHR_PLAINTEXT_ERRORS | (dark ? PIKCHR_DARK_MODE : 0);
  const output = pikchr.render(source, 'pikchr-svg', flags);
  if (!output.trimStart().startsWith('<svg')) {
    throw new Error(output.trim().slice(0, 1_000) || 'Pikchr could not render this diagram.');
  }
  return output;
}
