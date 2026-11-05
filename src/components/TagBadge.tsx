import { cn } from '@/lib/utils';
import { FileImage, FileText, Workflow } from 'lucide-react';
import { getOsLabel, type OsLabelId } from '@/lib/osLabels';
import {
  siAndroid,
  siApple,
  siDebian,
  siFedora,
  siFreebsd,
  siJpeg,
  siLinux,
  siMarkdown,
  siRedhat,
  siSvg,
  siUbuntu,
  type SimpleIcon,
} from 'simple-icons';

const OS_STYLES: Record<OsLabelId, string> = {
  windows: 'border-sky-500/45 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  macos: 'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  ios: 'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  ipados: 'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  linux: 'border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  android: 'border-lime-500/45 bg-lime-500/10 text-lime-800 dark:text-lime-300',
  ubuntu: 'border-orange-500/45 bg-orange-500/10 text-orange-800 dark:text-orange-300',
  debian: 'border-rose-500/45 bg-rose-500/10 text-rose-800 dark:text-rose-300',
  fedora: 'border-blue-500/45 bg-blue-500/10 text-blue-800 dark:text-blue-300',
  'red-hat': 'border-red-500/45 bg-red-500/10 text-red-800 dark:text-red-300',
  freebsd: 'border-red-500/45 bg-red-500/10 text-red-800 dark:text-red-300',
};

const ICONS: Partial<Record<OsLabelId, SimpleIcon>> = {
  macos: siApple,
  ios: siApple,
  ipados: siApple,
  linux: siLinux,
  android: siAndroid,
  ubuntu: siUbuntu,
  debian: siDebian,
  fedora: siFedora,
  'red-hat': siRedhat,
  freebsd: siFreebsd,
};

type FileTypeStyle = {
  icon?: SimpleIcon;
  fallback?: 'image' | 'document' | 'diagram';
  className: string;
};

const FILE_TYPE_STYLES: Record<string, FileTypeStyle> = {
  MD: { icon: siMarkdown, className: 'border-slate-500/45 bg-slate-500/10 text-slate-800 dark:text-slate-200' },
  PDF: { fallback: 'document', className: 'border-red-500/45 bg-red-500/10 text-red-700 dark:text-red-300' },
  PNG: { fallback: 'image', className: 'border-blue-500/45 bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  PIKCHR: { fallback: 'diagram', className: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  SVG: { icon: siSvg, className: 'border-orange-500/45 bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  JPG: { icon: siJpeg, className: 'border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  JPEG: { icon: siJpeg, className: 'border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  WEBP: { fallback: 'image', className: 'border-cyan-500/45 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300' },
  GIF: { fallback: 'image', className: 'border-fuchsia-500/45 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300' },
};

function WindowsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true">
      <path d="M2.5 4.2 10.8 3v8.1H2.5V4.2Zm9.4-1.4 9.6-1.4v9.7h-9.6V2.8ZM2.5 12.2h8.3v8.1l-8.3-1.2v-6.9Zm9.4 0h9.6v9.7l-9.6-1.4v-8.3Z" />
    </svg>
  );
}

function OsLogo({ id }: { id: OsLabelId }) {
  if (id === 'windows') return <WindowsLogo />;
  const icon = ICONS[id];
  return icon ? (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  ) : null;
}

function FileTypeLogo({ style }: { style: FileTypeStyle }) {
  if (style.icon) {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true">
        <path d={style.icon.path} />
      </svg>
    );
  }
  const Icon = style.fallback === 'image' ? FileImage : style.fallback === 'diagram' ? Workflow : FileText;
  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

interface Props {
  tag: string;
  category?: 'tag' | 'file-type';
  selected?: boolean;
  showHash?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({
  tag, category = 'tag', selected = false, showHash = true, compact = false, className, onClick,
}: Props) {
  const os = category === 'tag' ? getOsLabel(tag) : undefined;
  const fileType = category === 'file-type' ? tag.trim().replace(/^\./, '').toUpperCase() : undefined;
  const fileTypeStyle = fileType ? FILE_TYPE_STYLES[fileType] ?? {
    fallback: 'document' as const,
    className: 'border-border/60 bg-accent text-accent-foreground',
  } : undefined;
  const brandedClassName = os ? OS_STYLES[os.id] : fileTypeStyle?.className;
  const classes = cn(
    'inline-flex shrink-0 items-center border text-xs transition-colors',
    compact ? 'gap-1 rounded px-1.5 py-0.5' : 'gap-1.5 rounded-full px-2.5 py-0.5',
    brandedClassName ?? (selected
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border/60 bg-accent text-accent-foreground'),
    selected && (os || fileTypeStyle) && 'ring-1 ring-current ring-offset-1 ring-offset-background',
    onClick && 'cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    className,
  );
  const content = os ? (
    <><OsLogo id={os.id} /><span>{os.name}</span></>
  ) : fileType && fileTypeStyle ? (
    <><FileTypeLogo style={fileTypeStyle} /><span>{fileType}</span></>
  ) : <span>{showHash ? '#' : ''}{tag}</span>;
  const title = os ? `OS label: ${os.canonicalTag}` : fileType ? `${fileType} files` : undefined;

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={os ? `Operating system: ${os.name}` : undefined}
        aria-pressed={selected}
        data-os-label={os?.canonicalTag}
        data-file-type={fileType}
        title={title}
        onClick={onClick}
        className={classes}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      aria-label={os ? `Operating system: ${os.name}` : undefined}
      data-os-label={os?.canonicalTag}
      data-file-type={fileType}
      title={title}
      className={classes}
    >
      {content}
    </span>
  );
}

