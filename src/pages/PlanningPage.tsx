import { BookOpenCheck, Clock3, Download, FileCode2, FileText, GitMerge, ListChecks, Scissors, TerminalSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { AgentCommandButton } from '@/components/AgentCommandButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createTextZip } from '@/lib/zip';
import skillSource from '../../.agents/skills/planning/SKILL.md?raw';
import openaiSource from '../../.agents/skills/planning/agents/openai.yaml?raw';
import slicesSource from '../../.agents/skills/planning/references/five-hour-slices.md?raw';
import portfolioSource from '../../.agents/skills/planning/references/portfolio-review.md?raw';
import templatesSource from '../../.agents/skills/planning/references/templates.md?raw';
import lifecycleSource from '../../.agents/skills/planning/references/wiki-lifecycle.md?raw';
import validatorSource from '../../.agents/skills/planning/scripts/validate_wiki.py?raw';
import validatorTestsSource from '../../.agents/skills/planning/scripts/test_validate_wiki.py?raw';

const PROMPTS = [
  {
    title: 'Create or update a plan',
    description: 'Ground a plan in the current repository and divide the remaining work into mergeable phases.',
    command: 'Use $planning to create or update a .wiki plan for: <describe the goal>.',
  },
  {
    title: 'Execute one phase',
    description: 'Implement one bounded phase, validate it, and reconcile the plan with the resulting evidence.',
    command: 'Use $planning to execute phase <PHASE-ID> in .wiki/<plan-file>.md.',
  },
  {
    title: 'Review the portfolio',
    description: 'Rank remaining work and reconcile dependencies, indexes, and parallel execution lanes.',
    command: 'Use $planning to review the .wiki portfolio and recommend the next independently mergeable phases.',
  },
  {
    title: 'Prune completed work',
    description: 'Remove finished phases and retire plans whose durable outcomes now live outside the active queue.',
    command: 'Use $planning to prune completed work and retire finished plans in .wiki.',
  },
];

const RULES = [
  { icon: Clock3, title: 'Five-hour slices', text: 'Every executable phase fits at most five active agent hours.' },
  { icon: GitMerge, title: 'Mergeable handoffs', text: 'Each phase names one write set, one primary lock, focused validation, and a clean handoff.' },
  { icon: ListChecks, title: 'Evidence before plans', text: 'The agent inspects current code, tests, documentation, history, and worktree state before trusting wiki claims.' },
  { icon: Scissors, title: 'Remaining work only', text: 'Completed phases are removed, and a plan is deleted when no work remains.' },
];

const SKILL_FILES = [
  { path: 'SKILL.md', kind: 'Skill entrypoint', language: 'markdown', source: skillSource },
  { path: 'agents/openai.yaml', kind: 'Agent metadata', language: 'yaml', source: openaiSource },
  { path: 'references/wiki-lifecycle.md', kind: 'Lifecycle reference', language: 'markdown', source: lifecycleSource },
  { path: 'references/five-hour-slices.md', kind: 'Phase-sizing reference', language: 'markdown', source: slicesSource },
  { path: 'references/templates.md', kind: 'Authoring templates', language: 'markdown', source: templatesSource },
  { path: 'references/portfolio-review.md', kind: 'Portfolio-review reference', language: 'markdown', source: portfolioSource },
  { path: 'scripts/validate_wiki.py', kind: 'Validator', language: 'python', source: validatorSource },
  { path: 'scripts/test_validate_wiki.py', kind: 'Validator tests', language: 'python', source: validatorTestsSource },
];

const VALIDATION_COMMANDS = [
  {
    title: 'Validate a repository',
    command: 'python3 .agents/skills/planning/scripts/validate_wiki.py .',
  },
  {
    title: 'Test the validator',
    command: 'python3 -m unittest discover -s .agents/skills/planning/scripts -p "test_*.py"',
  },
];

function highlightedSource(source: string, language: string): string {
  const longestRun = Math.max(2, ...(source.match(/`+/g) ?? []).map(run => run.length));
  const fence = '`'.repeat(longestRun + 1);
  return `${fence}${language}\n${source}\n${fence}`;
}

function downloadSkillZip(): void {
  const prefix = '.agents/skills/planning/';
  const bytes = createTextZip(SKILL_FILES.map(file => ({
    path: `${prefix}${file.path}`,
    content: file.source,
  })));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'planning-skill.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function PlanningPage() {
  const { toast } = useToast();

  const download = () => {
    try {
      downloadSkillZip();
      toast({ title: 'Planning skill ZIP downloaded' });
    } catch (error) {
      toast({ title: 'Could not create planning skill ZIP', description: (error as Error).message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Planning Skill</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          The bundled <code>$planning</code> skill maintains a repository&apos;s <code>.wiki</code> as an accurate queue
          of remaining work. It creates, reviews, executes, prunes, and retires plans using bounded phases that an
          agent can finish and hand off cleanly.
        </p>
      </div>

      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Use the skill</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROMPTS.map(prompt => (
            <article key={prompt.title} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{prompt.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{prompt.description}</p>
              </div>
              <div className="mt-auto flex items-start gap-2 rounded-lg border border-border bg-background/60 p-2.5">
                <code className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs text-foreground">{prompt.command}</code>
                <AgentCommandButton command={prompt.command} label={`Copy ${prompt.title.toLowerCase()} command`} />
              </div>
            </article>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Portfolio and Phase Tracker copy buttons generate the same <code>$planning</code> invocation with the
          repository, plan path, and phase ID filled in.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operating contract</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {RULES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-4 flex gap-3">
              <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bundled definition</h2>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <TerminalSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Complete planning skill package</p>
              <p className="text-xs text-muted-foreground mt-1">
                All eight authored files are embedded below from <code>.agents/skills/planning</code>. Generated
                <code> __pycache__</code> bytecode is intentionally excluded.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={download} className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              Download skill folder
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {VALIDATION_COMMANDS.map(item => (
              <div key={item.title} className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">{item.title}</p>
                  <code className="block whitespace-pre-wrap break-words text-xs text-foreground">{item.command}</code>
                </div>
                <AgentCommandButton command={item.command} label={`Copy command: ${item.title}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {SKILL_FILES.map(file => {
            const ScriptIcon = file.path.endsWith('.py') ? FileCode2 : FileText;
            return (
              <details key={file.path} className="rounded-xl border border-border bg-card overflow-hidden group">
                <summary className="cursor-pointer list-none flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                  <ScriptIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-mono text-foreground truncate">{file.path}</span>
                    <span className="block text-[11px] text-muted-foreground">{file.kind}</span>
                  </span>
                  <AgentCommandButton
                    command={file.source}
                    label={`Copy ${file.path}`}
                    successTitle={`${file.path} copied`}
                  />
                </summary>
                <div className="md-body max-h-[32rem] overflow-auto border-t border-border bg-background/60 [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent [&_pre]:p-4">
                  <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}>
                    {highlightedSource(file.source, file.language)}
                  </ReactMarkdown>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

