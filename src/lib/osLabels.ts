export type OsLabelId =
  | 'windows'
  | 'macos'
  | 'ios'
  | 'ipados'
  | 'linux'
  | 'android'
  | 'ubuntu'
  | 'debian'
  | 'fedora'
  | 'red-hat'
  | 'freebsd';

export interface OsLabel {
  id: OsLabelId;
  name: string;
  canonicalTag: `os:${OsLabelId}`;
}

const NAMES: Record<OsLabelId, string> = {
  windows: 'Windows',
  macos: 'macOS',
  ios: 'iOS',
  ipados: 'iPadOS',
  linux: 'Linux',
  android: 'Android',
  ubuntu: 'Ubuntu',
  debian: 'Debian',
  fedora: 'Fedora',
  'red-hat': 'Red Hat',
  freebsd: 'FreeBSD',
};

const ALIASES: Record<string, OsLabelId> = {
  windows: 'windows',
  win32: 'windows',
  win64: 'windows',
  macos: 'macos',
  'mac-os': 'macos',
  osx: 'macos',
  darwin: 'macos',
  ios: 'ios',
  ipados: 'ipados',
  linux: 'linux',
  android: 'android',
  ubuntu: 'ubuntu',
  debian: 'debian',
  fedora: 'fedora',
  rhel: 'red-hat',
  redhat: 'red-hat',
  'red-hat': 'red-hat',
  freebsd: 'freebsd',
  'free-bsd': 'freebsd',
};

function normalizedKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/^(?:os|platform):/, '');
}

/** Resolve canonical `os:*` labels and compatible legacy bare OS tags. */
export function getOsLabel(tag: string): OsLabel | undefined {
  const id = ALIASES[normalizedKey(tag)];
  return id ? { id, name: NAMES[id], canonicalTag: `os:${id}` } : undefined;
}

export function isOsLabel(tag: string): boolean {
  return getOsLabel(tag) !== undefined;
}

