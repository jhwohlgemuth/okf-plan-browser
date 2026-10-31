import { ArrowRight, BookOpenCheck, Download, ExternalLink, FolderOpen, Laptop2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const RELEASES_URL = 'https://github.com/jhwohlgemuth/okf-plan-browser/releases/latest';

const DESKTOP_DOWNLOADS = [
  { platform: 'macOS · Apple Silicon', asset: '*_macos-aarch64.dmg', action: 'Open the DMG and move OKF Plan Browser to Applications.' },
  { platform: 'macOS · Intel', asset: '*_macos-x64.dmg', action: 'Open the DMG and move OKF Plan Browser to Applications.' },
  { platform: 'Windows · x64', asset: '*_windows-x64.msi', action: 'Run the MSI installer, then open OKF Plan Browser.' },
  { platform: 'Linux · x64', asset: '*_linux-x64.deb', action: 'Install the Debian package with your package manager.' },
  { platform: 'Linux · x64 portable', asset: '*_linux-x64.AppImage', action: 'Mark the AppImage executable, then launch it.' },
];

export function InstallPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-bold text-foreground">Install OKF Plan Browser</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Choose what you need: the desktop app for browsing <code>.wiki</code> portfolios, the
          planning skill for an agent to create and work through them, or both.
        </p>
      </header>

      <nav aria-label="Install options" className="grid gap-3 sm:grid-cols-2">
        <a href="#desktop-app" className="group flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-4 transition-colors hover:border-sky-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="rounded-lg bg-sky-500/15 p-2 text-sky-700 dark:text-sky-300"><Laptop2 className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Desktop app</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Download an installer for macOS, Windows, or Linux.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
        </a>
        <a href="#planning-skill" className="group flex items-start gap-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-4 transition-colors hover:border-violet-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="rounded-lg bg-violet-500/15 p-2 text-violet-700 dark:text-violet-300"><BookOpenCheck className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Planning skill</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Add the complete skill folder to a repository for your agent.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
        </a>
      </nav>

      <section id="desktop-app" className="scroll-mt-6 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Laptop2 className="h-5 w-5 text-sky-600 dark:text-sky-300" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">Install the desktop app</h2>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Open the latest release and choose the canonical file for your platform from the table below.</li>
          <li>Download its matching <code>.sha256</code> file to the same folder and verify the checksum.</li>
          <li>Install or launch the app, then open a project folder containing <code>.wiki/</code>.</li>
        </ol>
        <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          View latest release <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
        <ul aria-label="Desktop downloads" className="space-y-2 sm:hidden">
          {DESKTOP_DOWNLOADS.map(item => (
            <li key={item.asset} className="rounded-lg border border-border bg-background/50 p-3 text-xs">
              <p className="font-semibold text-foreground">{item.platform}</p>
              <p className="mt-1 font-mono text-muted-foreground">{item.asset}</p>
              <p className="mt-2 leading-relaxed text-muted-foreground">{item.action}</p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
          <table className="w-full min-w-[580px] text-left text-xs">
            <thead className="bg-muted/50 text-foreground">
              <tr><th scope="col" className="px-3 py-2 font-semibold">Platform</th><th scope="col" className="px-3 py-2 font-semibold">Choose the asset ending in</th><th scope="col" className="px-3 py-2 font-semibold">Install</th></tr>
            </thead>
            <tbody className="divide-y divide-border text-muted-foreground">
              {DESKTOP_DOWNLOADS.map(item => (
                <tr key={item.asset}>
                  <th scope="row" className="px-3 py-3 font-medium text-foreground">{item.platform}</th>
                  <td className="px-3 py-3 font-mono">{item.asset}</td>
                  <td className="px-3 py-3">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          <p>On macOS, run <code>shasum -a 256 -c &lt;asset&gt;.sha256</code>; on Linux, run <code>sha256sum -c &lt;asset&gt;.sha256</code>. On Windows, compare <code>Get-FileHash</code> output with the matching sidecar. The current release is unsigned, so your operating system may show a first-launch warning.</p>
        </div>
      </section>

      <section id="planning-skill" className="scroll-mt-6 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-violet-600 dark:text-violet-300" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">Install the planning skill</h2>
        </div>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Open the Planning Skill page and select <strong className="text-foreground">Download skill folder</strong>.</li>
          <li>Extract the ZIP at the root of your target repository. Confirm that <code>.agents/skills/planning/SKILL.md</code> exists, with its <code>references/</code>, <code>scripts/</code>, and <code>agents/</code> siblings.</li>
          <li>Open that repository in an agent that supports repository skills and ask it to use <code>$planning</code>.</li>
        </ol>
        <Link to="/planning" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Open Planning Skill page <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
          <p>Keep the complete folder together. The desktop app displays plans; the skill gives your agent the planning, implementation, drafting, and review workflows. You can use either one independently.</p>
        </div>
      </section>
    </div>
  );
}
