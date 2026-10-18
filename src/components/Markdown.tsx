import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  children: string;
  /** Resolve a relative link; return a handler if it points to something navigable. */
  resolveLink?: (href: string) => { exists: boolean; open: () => void } | null;
}

const EXTERNAL_RE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

export function Markdown({ children, resolveLink }: Props) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => {
            if (!href || EXTERNAL_RE.test(href)) {
              return <a href={href} target="_blank" rel="noreferrer noopener">{c}</a>;
            }
            if (href.startsWith('#')) return <span>{c}</span>;
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
