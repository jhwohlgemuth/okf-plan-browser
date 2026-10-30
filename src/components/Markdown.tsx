import { isValidElement, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import bash from 'highlight.js/lib/languages/bash';
import diff from 'highlight.js/lib/languages/diff';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import { Check, Clipboard } from 'lucide-react';
import { InlineWikiImage, type AssetTarget } from './AssetViewer';
import { planAnchor } from '@/lib/planLinks';

interface Props {
  children: string;
  /** Resolve a relative link; return a handler if it points to something navigable. */
  resolveLink?: (href: string) => { exists: boolean; open: () => void } | null;
  resolveImage?: (src: string) => AssetTarget | null;
  openAsset?: (target: AssetTarget) => void;
  headingId?: (text: string) => string;
}

const EXTERNAL_RE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const languages = { bash, diff, javascript, json, markdown, python, typescript, yaml };

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

function MarkdownHeading({ level, children, headingId }: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  headingId?: (text: string) => string;
}) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const text = nodeText(children);
  return <Tag id={headingId?.(text) ?? planAnchor(text)} tabIndex={-1}>{children}</Tag>;
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText.replace(/\n$/, '') ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="code-block group relative">
      <pre ref={ref}>{children}</pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code to clipboard"
        className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground bg-card/80 opacity-0 transition-opacity group-hover:opacity-60 group-focus-within:opacity-60 hover:!opacity-100 focus-visible:!opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-od-green" /> : <Clipboard className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function Markdown({ children, resolveLink, resolveImage, openAsset, headingId }: Props) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true, languages,
          aliases: { js: 'javascript', ts: 'typescript', sh: 'bash', yml: 'yaml', py: 'python', md: 'markdown' } }]]}
        components={{
          pre: ({ children: c }) => <CodeBlock>{c}</CodeBlock>,
          h1: ({ children: c }) => <MarkdownHeading level={1} headingId={headingId}>{c}</MarkdownHeading>,
          h2: ({ children: c }) => <MarkdownHeading level={2} headingId={headingId}>{c}</MarkdownHeading>,
          h3: ({ children: c }) => <MarkdownHeading level={3} headingId={headingId}>{c}</MarkdownHeading>,
          h4: ({ children: c }) => <MarkdownHeading level={4} headingId={headingId}>{c}</MarkdownHeading>,
          h5: ({ children: c }) => <MarkdownHeading level={5} headingId={headingId}>{c}</MarkdownHeading>,
          h6: ({ children: c }) => <MarkdownHeading level={6} headingId={headingId}>{c}</MarkdownHeading>,
          img: ({ src, alt }) => {
            const target = src ? resolveImage?.(src) : null;
            if (target) return <InlineWikiImage target={target} alt={alt ?? ''} onOpen={() => openAsset?.(target)} />;
            return src && EXTERNAL_RE.test(src) ? <img src={src} alt={alt ?? ''} className="max-h-96 max-w-full object-contain" />
              : <span className="md-broken-link" title={`Image not found: ${src ?? ''}`}>{alt || src}</span>;
          },
          a: ({ href, children: c }) => {
            if (!href || EXTERNAL_RE.test(href)) {
              return <a href={href} target="_blank" rel="noreferrer noopener">{c}</a>;
            }
            const target = resolveLink?.(href);
            if (target?.exists) {
              return (
                <a
                  href={href}
                  onClick={e => { e.preventDefault(); target.open(); }}
                >
                  {c}
                </a>
              );
            }
            return <span className="md-broken-link" title={`Not found in loaded wikis: ${href}`}>{c}</span>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
