import { afterEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/tauri', () => ({ invoke }));
vi.mock('@/store/planStore', () => ({
  usePlanStore: { getState: () => ({ repos: [] }) },
}));

import { File as NodeFile } from 'node:buffer';
import { forgetAllAssets, getAssetText, getAssetUrl, registerAssetFiles } from './wikiAssets';

describe('native wiki assets', () => {
  afterEach(() => {
    forgetAllAssets();
    invoke.mockReset();
    vi.restoreAllMocks();
  });

  it('loads a registered native asset through the scope-checked command', async () => {
    invoke.mockResolvedValue([60, 115, 118, 103, 47, 62]);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:native-asset');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    registerAssetFiles('repo', [{ path: '_assets/diagram.svg' }], '/selected/.wiki');

    await expect(getAssetUrl('repo', '_assets/diagram.svg')).resolves.toBe('blob:native-asset');
    expect(invoke).toHaveBeenCalledWith('read_wiki_asset', {
      rootPath: '/selected/.wiki',
      assetPath: '_assets/diagram.svg',
    });
  });

  it('reads registered Pikchr assets as source text', async () => {
    const FileCtor = NodeFile as unknown as typeof File;
    registerAssetFiles('repo', [{ path: '_assets/diagram.pikchr', file: new FileCtor(['box "Plan"'], 'diagram.pikchr') }]);

    await expect(getAssetText('repo', '_assets/diagram.pikchr')).resolves.toBe('box "Plan"');
  });
});
