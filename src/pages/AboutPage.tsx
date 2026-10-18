import { ExternalLink, Box, Lock } from 'lucide-react';
import {
  siReact, siVite, siTypescript, siTailwindcss, siTauri, siFramer, siReactrouter,
  siRadixui, siReactquery, siD3, siMarkdown, siYaml, siLucide, siGithubcopilot,
  type SimpleIcon,
} from 'simple-icons';

interface Tech { name: string; url: string; icon?: SimpleIcon; note: string }

const OKF_URL = 'https://github.com/GoogleCloudPlatform/open-knowledge-format';

const TECH: Tech[] = [
  { name: 'React',          url: 'https://react.dev',                  icon: siReact,       note: 'UI library' },
  { name: 'TypeScript',     url: 'https://www.typescriptlang.org',     icon: siTypescript,  note: 'Language' },
  { name: 'Vite',           url: 'https://vite.dev',                   icon: siVite,        note: 'Build tooling' },
  { name: 'Tailwind CSS',   url: 'https://tailwindcss.com',            icon: siTailwindcss, note: 'Styling' },
  { name: 'Radix UI',       url: 'https://www.radix-ui.com',           icon: siRadixui,     note: 'Accessible primitives' },
  { name: 'Zustand',        url: 'https://zustand.docs.pmnd.rs',                            note: 'State management' },
  { name: 'React Router',   url: 'https://reactrouter.com',            icon: siReactrouter, note: 'Routing' },
  { name: 'TanStack Query', url: 'https://tanstack.com/query',         icon: siReactquery,  note: 'Async state' },
  { name: 'D3',             url: 'https://d3js.org',                   icon: siD3,          note: 'Dependency graph' },
  { name: 'Framer Motion',  url: 'https://motion.dev',                 icon: siFramer,      note: 'Animation' },
  { name: 'Lucide',         url: 'https://lucide.dev',                 icon: siLucide,      note: 'Icons' },
  { name: 'Tauri',          url: 'https://tauri.app',                  icon: siTauri,       note: 'Desktop wrapper' },
  { name: 'Markdown',       url: 'https://commonmark.org',             icon: siMarkdown,    note: 'Wiki content format' },
  { name: 'YAML',           url: 'https://yaml.org',                   icon: siYaml,        note: 'Frontmatter' },
];

const EXAMPLES = [
  { name: 'ACORN', note: 'Planning wiki with phased, five-hour execution slices, dependency network and parallel lanes.' },
  { name: 'Xylem', note: 'Feature and refactor plans tracked as a .wiki portfolio.' },
];

function Logo({ icon }: { icon?: SimpleIcon }) {
  if (!icon) return <Box className="h-5 w-5 text-muted-foreground" />;
  const dark = ['000000', '161618'].includes(icon.hex.toLowerCase());
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground" fill={dark ? 'currentColor' : `#${icon.hex}`} role="img" aria-label={icon.title}>
      <path d={icon.path} />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">About</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          OKF Plan Browser — a local-first viewer for <code>.wiki</code> planning portfolios.
        </p>
      </div>

      <Section title="Open Knowledge Format">
        <a
          href={OKF_URL} target="_blank" rel="noreferrer"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-od-blue/60 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-foreground">OKF — Open Knowledge Format</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portable, cross-linked markdown that humans and AI agents both read. Plan wikis here follow this idea.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
        </a>
      </Section>

      <Section title="Exemplary projects using an OKF plan wiki">
        <div className="grid sm:grid-cols-2 gap-3">
          {EXAMPLES.map(e => (
            <div key={e.name} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                {e.name}
                <Lock className="h-3 w-3 text-muted-foreground" aria-label="Internal repository" />
              </p>
              <p className="text-xs text-muted-foreground mt-1">{e.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Built with">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TECH.map(t => (
            <a
              key={t.name} href={t.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:border-od-blue/60 transition-colors"
            >
              <Logo icon={t.icon} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t.note}</p>
              </div>
            </a>
          ))}
        </div>
      </Section>

      <Section title="AI disclosure">
        <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-3">
          <a href="https://www.aihonestybadge.com/" target="_blank" rel="noreferrer" className="inline-block">
            <img
              src={`${import.meta.env.BASE_URL}badges/ai-generated-small.svg`}
              alt="AI Generated badge" height={20}
            />
          </a>
          <p className="text-sm text-foreground/90">
            The application code, documentation and this page were written by an AI coding
            assistant (<span className="inline-flex items-center gap-1 align-middle">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true"><path d={siGithubcopilot.path} /></svg>
              GitHub Copilot</span>) working from prompts and feedback from a human maintainer.
          </p>
          <p className="text-xs text-muted-foreground">
            The human role was product direction, requirements, running the app against real wikis and reporting
            bugs. Treat the code as AI-generated: review it before relying on it. Badge by{' '}
            <a className="underline" href="https://www.aihonestybadge.com/" target="_blank" rel="noreferrer">AI Honesty Badge</a>.
          </p>
        </div>
      </Section>
    </div>
  );
}
