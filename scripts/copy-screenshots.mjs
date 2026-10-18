import { copyFileSync, mkdirSync } from 'node:fs';

const src = 'e2e/__screenshots__';
const dest = 'docs/screenshots';
const files = [
  ['desktop/portfolio.png', 'portfolio.png'],
  ['desktop/phases.png', 'phases.png'],
  ['desktop/graph.png', 'graph.png'],
  ['desktop/plan-detail.png', 'plan-detail.png'],
  ['desktop/home-loaded.png', 'home-loaded.png'],
  ['desktop/about.png', 'about.png'],
  ['phone/portfolio.png', 'mobile-portfolio.png'],
];

mkdirSync(dest, { recursive: true });
for (const [from, to] of files) copyFileSync(`${src}/${from}`, `${dest}/${to}`);
console.log(`Copied ${files.length} screenshots to ${dest}`);
