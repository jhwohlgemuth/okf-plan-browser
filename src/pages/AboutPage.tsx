import { ExternalLink, Box, Lock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WalkthroughButton } from '@/components/WalkthroughButton';
import {
  siReact, siVite, siTypescript, siTailwindcss, siTauri, siReactrouter,
  siRadixui, siD3, siMarkdown, siYaml, siLucide, siGithub, siGithubcopilot,
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
  { name: 'D3',             url: 'https://d3js.org',                   icon: siD3,          note: 'Dependency graph' },
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
      <div data-tour="about-heading">
        <h1 className="text-xl font-bold text-foreground">About</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The official home of the planning skill and a local-first viewer for <code>.wiki</code> planning portfolios.
        </p>
        <WalkthroughButton className="mt-3" />
        <a
          href="https://github.com/jhwohlgemuth/okf-plan-browser"
          target="_blank" rel="noreferrer"
          className="group mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-od-blue/10 to-card p-4 transition-colors hover:border-od-blue/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-blue focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
              <path d={siGithub.path} />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              OKF Plan Browser
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-od-blue" aria-hidden="true" />
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Explore the source, suggest ideas, or contribute on GitHub.
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <img
              src="https://img.shields.io/github/stars/jhwohlgemuth/okf-plan-browser?style=flat&color=eab308&label=Stars"
              alt="GitHub star count"
              height={20}
              className="h-5"
              onError={event => { event.currentTarget.hidden = true; }}
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
              <Star className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
              Star on GitHub
            </span>
          </span>
        </a>
      </div>

      <Section title="Planning skill">
        <p className="text-sm text-muted-foreground leading-relaxed">
          This project maintains the canonical planning skill: portfolio maintenance, bounded implementation loops,
          source-backed drafts, and factual claim review. Progress notes preserve decisions and validation evidence
          so an agent can resume across sessions. The browser provides portfolio views and the downloadable skill;
          execution happens in your agent environment.
        </p>
        <Link to="/planning" className="inline-block mt-3 text-sm text-od-blue underline underline-offset-4">
          Read the workflows and download the planning skill
        </Link>
      </Section>

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
            The application code, documentation and this page were created with assistance from{' '}
            <a className="underline" href="https://openai.com/codex/" target="_blank" rel="noreferrer">Codex</a>,{' '}
            <a className="inline-flex items-center gap-1 align-middle underline" href="https://github.com/features/copilot" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true"><path d={siGithubcopilot.path} /></svg>
              GitHub Copilot</a>, and{' '}
            <a className="underline" href="https://www.microsoft.com/microsoft-365/copilot" target="_blank" rel="noreferrer">Microsoft 365 Copilot</a>,
            working from prompts and feedback from a human maintainer.
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
